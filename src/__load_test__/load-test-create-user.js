'use strict';

const faker = require('faker');
const loadTestUser = module.exports = {};

loadTestUser.create = (userContext,events,done) => {
  userContext.vars.username = faker.internet.userName() + Math.random() + Math.random();
  userContext.vars.password = faker.internet.password() + Math.random() + Math.random();

  return done();
};
