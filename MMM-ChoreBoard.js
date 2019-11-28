Module.register('MMM-ChoreBoard', {
  // Default module config.
  defaults: {
    persons: [],
    chores: [],
    nextDueDate: null
  },

  choreSchedule: {
    schedule: [],
    nextDueDate: ""
  },

  getCommands: function(commander) {
    commander.add({
      command: 'aemtli',
      callback: 'command_choreDone'
    });
  },

  // Override
  start: function() {
    Log.log(this.name + ' is starting');
    this.getSchedule();
  },

  // Override
  getStyles: function() {
    return [
      'MMM-ChoreBoard.css'
    ];
  },

  // Override
  socketNotificationReceived: function(notification, payload) {
    if (notification === 'CHORESCHEDULE') {
      this.choreSchedule = payload;
      this.updateDom();
    }
  },

  command_choreDone: function(command, handler) {
    let personExists = this.config.persons.map((person) => {
      return person.toLowerCase();
    }).includes(handler.args.toLowerCase());

    let message = '';
    if (personExists) {
      message = 'Merci ' + handler.args + ' 😘';
      this.sendSocketNotification('CHORE_DONE', handler.args);
    } else {
      message = 'Did not find person: ' + handler.args;
    }
    handler.reply('TEXT', message);
  },

  getSchedule() {
    this.sendSocketNotification('GET_SCHEDULE', this.config);
    setInterval(() => {
      this.sendSocketNotification('GET_SCHEDULE', this.config);
		}, 60 * 60 * 1000);
  },

  // Override
  getDom: function() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('small');

    const choreTable = document.createElement('table');

    this.choreSchedule.schedule.forEach(element => {
      const tableRow = document.createElement('tr');
      const choreCell = document.createElement('td');
      const personCell = document.createElement('td');
      personCell.innerHTML += element.person;

      for (let i = 0; i < element.chores.length; ++i) {
        choreCell.innerHTML += i > 0 ? ', ' + element.chores[i] : element.chores[i];
      }

      if (element.done) {
        choreCell.classList.add('chore-done');
      }

      tableRow.appendChild(personCell);
      tableRow.appendChild(choreCell);
      choreTable.appendChild(tableRow);
    });

    const dateRow = document.createElement('tr');
    const dateCell = document.createElement('td');
    const textCell = document.createElement('td');

    dateCell.innerHTML += this.choreSchedule.nextDueDate;
    dateCell.classList.add('bold');
    dateCell.classList.add('bright');

    textCell.innerHTML += '';
    textCell.classList.add('bright');

    dateRow.classList.add('due-date-row');
    dateRow.appendChild(dateCell);
    dateRow.appendChild(textCell);

    choreTable.classList.add('chore-table');
    choreTable.appendChild(dateRow);

    wrapper.appendChild(choreTable);

    return wrapper;
  }
});
