const NodeHelper = require("node_helper");
const fs = require("fs");
const moment = require("moment");

module.exports = NodeHelper.create({
  choreSchedule: null,
  config: null,

  // Override
  start: function() {
    console.log(this.name + " is started");
  },

  // Override
  socketNotificationReceived: function(notification, payload) {
    if (notification === "GET_SCHEDULE") {
      this.config = payload;
      this.getChoreSchedule();
    }
    else if (notification === "CHORE_DONE") {
      this.setChoreDone(payload);
    }
  },

  getChoreSchedule: function() {
    if (this.choreSchedule !== null) {
      this.updateChoreSchedule();
    } else {
      this.readChoreSchedule();
    }
  },

  createChoreSchedule: function() {
    if (this.config.persons.length !== this.config.chores.length) {
      console.error(this.name + ": Same number of chores and persons needed!");
      return;
    }

    this.choreSchedule = {};
    this.choreSchedule.schedule = [];
    this.choreSchedule.nextDueDate = this.config.nextDueDate;
    for (let i = 0; i < this.config.persons.length; ++i) {
      this.choreSchedule.schedule.push({
        person: this.config.persons[i],
        chores: [this.config.chores[i]],
        done: false
      });
    }

    this.sendSocketNotification("CHORESCHEDULE", this.choreSchedule);
    this.saveChoreSchedule();
  },

  readChoreSchedule: function() {
    fs.readFile(this.path + "/choreSchedule.json", (err, data) => {
      if (err && err.code === "ENOENT") {
        this.createChoreSchedule();
        return;
      } else if (err) {
        throw err;
      }

      this.choreSchedule = JSON.parse(data);

      if (
        moment(this.config.nextDueDate).isAfter(
          moment(this.choreSchedule.nextDueDate)
        )
      ) {
        this.createChoreSchedule();
        // TODO handle case when json file has a due date in the past
      } else {
        this.sendSocketNotification("CHORESCHEDULE", this.choreSchedule);
      }
    });
  },

  updateChoreSchedule: function() {
    const today = moment().startOf("day");
    if (today.isSame(moment(this.choreSchedule.nextDueDate).add(1, "days"))) {
      this.choreSchedule.schedule.forEach(element => {
        let choreIndex = this.config.chores.indexOf(element.chores.slice(-1));
        let newChoreIndex =
          choreIndex + 1 !== this.config.chores.length ? choreIndex + 1 : 0;

        if (element.done) {
          element.chores = [];
        }
        element.chores.push(this.config.chores(newChoreIndex));
      });

      this.choreSchedule.nextDueDate = moment(this.choreSchedule.nextDueDate)
        .add(2, "weeks")
        .format("DD.MM.YY");
      this.saveChoreSchedule();
    }

    this.sendSocketNotification("CHORESCHEDULE", this.choreSchedule);
  },

  saveChoreSchedule: function() {
    fs.writeFile(
      this.path + "/choreSchedule.json",
      JSON.stringify(this.choreSchedule),
      err => {
        if (err) throw err;
      }
    );
  },

  setChoreDone: function(person) {
    for (let i = 0; i < this.choreSchedule.schedule.length; ++i) {
      if (this.choreSchedule.schedule[i].person.toLowerCase() !== person.toLowerCase()) {
        continue;
      }

      if (this.choreSchedule.schedule[i].chores.length <= 1) {
        this.choreSchedule.schedule[i].done = true;
      } else {
        this.choreSchedule.schedule[i].chores.shift();
      }

      this.saveChoreSchedule();
      this.sendSocketNotification("CHORESCHEDULE", this.choreSchedule);

      return;
    }
  }
});
