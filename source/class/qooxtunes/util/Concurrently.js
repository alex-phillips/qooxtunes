qx.Class.define("qooxtunes.util.Concurrently", {
  extend: qx.core.Object,

  construct(taskLimit) {
    super();
    this.__taskLimit = taskLimit;
    this.__tasksQueue = [];
    this.__tasksActiveCount = 0;
  },

  members: {
    __taskLimit: 1,
    __tasksQueue: [],
    __tasksActiveCount: 0,
    __finished: false,
    __finishedCallback: null,

    _registerTask(handler) {
      this.__tasksQueue.push(handler);
    },

    _executeTasks() {
      var self = this;

      if (
        this.__tasksQueue.length === 0 &&
        this.__tasksActiveCount === 0 &&
        this.__finished === false
      ) {
        this.__finished = true;
        if (this.__finishedCallback) {
          this.__finishedCallback();
        }

        return;
      }

      while (
        this.__tasksQueue.length &&
        this.__tasksActiveCount < this.__taskLimit
      ) {
        var task = this.__tasksQueue[0];
        this.__tasksQueue = this.__tasksQueue.slice(1);
        this.__tasksActiveCount += 1;

        task().then(function (result) {
          self.__tasksActiveCount -= 1;
          self._executeTasks();

          return result;
        });
        // .catch(function (err) {
        //   self.__tasksActiveCount -= 1;
        //   self._executeTasks();

        //   throw err;
        // });
      }
    },

    run() {
      this.__finished = false;
      this._executeTasks(true);
    },

    onTasksComplete(callback) {
      this.__finishedCallback = callback;
    },

    task(handler) {
      var self = this;
      return new Promise(function (resolve, reject) {
        return self._registerTask(function () {
          return handler().then(resolve);
        });
      });
    },
  },
});
