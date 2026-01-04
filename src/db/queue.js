let dbWriteQueue = Promise.resolve();

export const enqueueDbWrite = (task) => {
  dbWriteQueue = dbWriteQueue.then(task, task);
  return dbWriteQueue;
};
