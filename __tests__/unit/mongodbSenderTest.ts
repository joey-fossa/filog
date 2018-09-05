import sinon = require("sinon");
import {TS_KEY} from "../../src/IContext";
import * as LogLevel from "../../src/LogLevel";
import MongoDbSender from "../../src/Senders/MongodbSender";

// This is a builtin Meteor interface: cannot rename it.
// tslint:disable-next-line
interface Mongo {
  Collection: (name: string) => void;
}

function testMongoDbSender() {
  const mongo: Mongo = {
    // Do NOT replace by an arrow function: it breaks the Sinon spy.
    Collection(name): void {
      // TSlint ignores the use of this method by Sinon in the 'should add a
      // "send" timestamp to non-empty context' test below, so do not remove it,
      // as it breaks that test.
      // tslint:ignore-next-line
      this.insert = () => undefined;
      this.name = name;
    },
  };

  test("should accept a collection name", () => {
    const spy = sinon.spy(mongo, "Collection");
    const sender = new MongoDbSender(mongo, "some_collection");
    expect(sender).toBeInstanceOf(MongoDbSender);
    expect(spy.calledOnce).toBe(true);
  });

  test("should accept an existing collection", () => {
    const collection = new mongo.Collection("fake");
    const sender = new MongoDbSender(mongo, collection);
    expect(sender).toBeInstanceOf(MongoDbSender);
    expect(sender.store).toBe(collection);
  });

  test("should reject invalid collection values", () => {
    const collection = 42;
    // Force type to accept invalid data.
    expect(() => new MongoDbSender(mongo, collection as any)).toThrowError(Error);
  });

  test("should add a \"send\" timestamp to empty context", () => {
    const collection = new mongo.Collection("fake");
    const sender = new MongoDbSender(mongo, collection);
    const insertSpy = sinon.spy(sender.store, "insert");
    const before = +new Date();
    const level: LogLevel.Levels = LogLevel.WARNING;
    const message = "message";
    const details = {};

    sender.send(level, message, details);

    const after = +new Date();
    // Collection.insert was called once.
    expect(insertSpy.calledOnce).toBe(true);

    const callArgs = insertSpy.firstCall.args[0];
    // Level is passed.
    expect(callArgs.level).toBe(level);
    // Message is passed.
    expect(callArgs.message).toBe(message);

    const timestamp = callArgs.context[TS_KEY].server.send;
    // A numeric store timestamp is passed.
    expect(typeof timestamp).toBe("number");
    // Timestamp is later than 'before'.
    expect(timestamp >= before).toBe(true);
    // Timestamp is earlier than 'after'.
    expect(timestamp <= after).toBe(true);
  });

  test("should add a \"send\" timestamp to non-empty context", () => {
    const collection = new mongo.Collection("fake");
    const sender = new MongoDbSender(mongo, collection);
    const insertSpy = sinon.spy(sender.store, "insert");
    const before = +new Date();
    const level: LogLevel.Levels = LogLevel.Levels.WARNING;
    const message = "message";
    const details = {
      [TS_KEY]: {
        whatever: 1480849124018,
      },
    };

    sender.send(level, message, details);
    const after = +new Date();
    // Collection.insert was called once.
    expect(insertSpy.calledOnce).toBe(true);
    const callArgs = insertSpy.firstCall.args[0];
    // Level is passed.
    expect(callArgs.level).toBe(level);
    // Message is passed.
    expect(callArgs.message).toBe(message);

    const timestamp = callArgs.context[TS_KEY].server.send;
    // A numeric store timestamp is passed.
    expect(typeof timestamp).toBe("number");
    // Timestamp is later than 'before'.
    expect(timestamp >= before).toBe(true);
    // Timestamp is earlier than 'after'.
    expect(timestamp <= after).toBe(true);
  });
}

export {
  testMongoDbSender,
};
