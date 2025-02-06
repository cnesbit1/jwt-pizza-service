const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database.js');

const { createAdminUser, createDinerUser, expectValidJwt, randomName } = require('./functions.js')

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let adminAuthToken;
let testUserEmail;

beforeAll(async () => {
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    testUserID = registerRes.body.user.id;
    testUserEmail = registerRes.body.user.email;
    expectValidJwt(testUserAuthToken);
  });

test('createFranchise with success', async () => {

});

  