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
      callback: 'command_choreDone',
      description: 'Toggle chore status\nTry `/aemtli <<yourname>>`.'
    });

    commander.add({
      command: 'aemtlistatus',
      callback: 'command_choreBoard',
      description: 'Show chore board'
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
      message += 'Merci ' + handler.args + ' 😘';
      this.sendSocketNotification('CHORE_DONE', handler.args);
    } else {
      message += 'Konnte Person nicht finden: ' + handler.args + '\n\n';
      message += 'Verfügbare Personen: \n';
      for (const person of this.config.persons) {
        message += '- `' + person + '`\n';
      }
    }

    handler.say('TEXT', message, { parse_mode: "Markdown" });
  },

  command_choreBoard: function(command, handler) {
    handler.say('TEXT', this.getChoreBoard('*Deadline*: ' + this.choreSchedule.nextDueDate), { parse_mode: "Markdown" });
  },

  getChoreBoard: function(customText) {
    let message = '🧻🧽🧹 Ämtliplan 🧹🧽🧻\n\n';
    message += customText + '\n\n';

    for (const item of this.choreSchedule.schedule) {
      if (item.chores.length > 1) {
        message += '‼️ ';
      } else {
        message += item.done ? '✅ ' : '⏺ ';
      }

      message += '*' + item.person + '* -> ';
      for (let i = 0; i < item.chores.length; ++i) {
        message += i > 0 ? ', ' + '`' + item.chores[i] + '`' : '`' + item.chores[i] + '`';
      }
      message += '\n';
    }

    return message;
  },

  handleTelegramNotifications: function() {
    const today = moment().startOf('day');

    const currentHour = moment().hour();
    const dueDate = moment(this.choreSchedule.nextDueDate, 'DD.MM.YY');

    if (today.hour(currentHour).isSame(dueDate.hour(12), 'hour')) {
      this.sendTelegramReminder('‼️*Deadline hüt*‼️');
    } else if (today.hour(currentHour).isSame(dueDate.subtract(1, 'days').hour(12), 'hour')) {
      this.sendTelegramReminder('*Deadline morn*');
    }

    if (today.hour(currentHour).isSame(moment().startOf('day').hour(12), 'hour')) {
      for (const item of this.choreSchedule.schedule) {
        if (item.chores.length > 1) {
          this.sendTelegramReminder('‼️ Überfälligi ämtli gfunde.\n\nBi meh als eim ämtli ih dinere liste, isch das ganz links snächste wo muss abhäglet werde.');
          break;
        }
      }
    }

  },

  sendTelegramReminder: function(customText) {
    let message = this.getChoreBoard(customText);
    this.sendNotification('TELBOT_TELL_GROUP', message);
  },

  getSchedule() {
    this.sendSocketNotification('GET_SCHEDULE', this.config);
    setInterval(() => {
      this.sendSocketNotification('GET_SCHEDULE', this.config);
      this.handleTelegramNotifications();
		}, 60 * 60 * 1000);
  },

  // Override
  getDom: function() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('small');

    const choreTable = document.createElement('table');

    this.choreSchedule.schedule.forEach(item => {
      const tableRow = document.createElement('tr');
      const choreCell = document.createElement('td');
      const personCell = document.createElement('td');
      personCell.innerHTML += item.person;

      for (let i = 0; i < item.chores.length; ++i) {
        choreCell.innerHTML += i > 0 ? ', ' + item.chores[i] : item.chores[i];
      }

      if (item.done) {
        personCell.classList.add('chore-done');
        choreCell.classList.add('chore-done-cell');
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
