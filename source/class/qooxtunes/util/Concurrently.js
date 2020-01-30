qx.Class.define("qooxtunes.util.Concurrently",
  {
    extend: qx.core.Object,

    construct: function (taskLimit) {
      this.base(arguments);
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

      _registerTask: function (handler) {
        this.__tasksQueue.push(handler)
      },

      _executeTasks: function () {
        var self = this;

        if (this.__tasksQueue.length === 0 && this.__tasksActiveCount === 0 && this.__finished === false) {
          this.__finished = true;
          if (this.__finishedCallback) {
            this.__finishedCallback();
          }

          return;
        }

        while (this.__tasksQueue.length && this.__tasksActiveCount < this.__taskLimit) {
          var task = this.__tasksQueue[0];
          this.__tasksQueue = this.__tasksQueue.slice(1);
          this.__tasksActiveCount += 1;

          task()
            .then(function (result) {
              self.__tasksActiveCount -= 1;
              self._executeTasks();

              return result;
            })
            // .catch(function (err) {
            //   self.__tasksActiveCount -= 1;
            //   self._executeTasks();

            //   throw err;
            // });
        }
      },

      run: function () {
        this.__finished = false;
        this._executeTasks(true);
      },

      onTasksComplete: function (callback) {
        this.__finishedCallback = callback;
      },

      task: function (handler) {
        var self = this;
        return new Promise(function (resolve, reject) {
          return self._registerTask(function () {
            return handler()
              .then(resolve)
          })
        })
      }
    }
  }
);
