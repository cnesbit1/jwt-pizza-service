const request = require('supertest');
const app = require('../service');
const jwt = require('jsonwebtoken');
const config = require('../config.js');
const { createAdminUser, createDinerUser, expectValidJwt, randomName } = require('./functions.js')

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testUserId;
let adminAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
  expectValidJwt(testUserAuthToken);
});

test('Login with success', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('Logout with success', async () => {
  const logoutRes = await request(app)
    .delete('/api/auth')
    .set("Authorization", `Bearer ${testUserAuthToken}`)

  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});

test('Logout without proper token', async () => {
    const logoutRes = await request(app)
      .delete('/api/auth')
      .set("Authorization", `Bearer MistakeToken`)
  
    expect(logoutRes.status).toBe(401);
    expect(logoutRes.body.message).toBe('unauthorized');
  });

test('Register without proper name', async () => {
  const testUser = { email: 'reg@test.com', password: 'a' };
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  expect(registerRes.status).toBe(400);
});

test('UpdateUser with success', async () => {
    const adminUser = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(adminUser)
    adminAuthToken = adminLoginRes.body.token;

    const updatedEmail = `${randomName()}@updated.com`;
    const updatedPassword = `${randomName()}`;

    const updateRes = await request(app)
        .put(`/api/auth/${testUserId}`)
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send({ email: updatedEmail, password: updatedPassword });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.email).toBe(updatedEmail);
});

test('UpdateUser with user without admin permission', async () => {
    const secondUser = await createDinerUser();
    const secondUserLoginRes = await request(app).put('/api/auth').send(secondUser)
    let secondUserAuthToken = secondUserLoginRes.body.token;

    const updatedEmail = `${randomName()}@updated.com`;
    const updatedPassword = `${randomName()}`;

    const updateRes = await request(app)
        .put(`/api/auth/${testUserId}`)
        .set("Authorization", `Bearer ${secondUserAuthToken}`)
        .send({ email: updatedEmail, password: updatedPassword });

    expect(updateRes.status).toBe(403);
});

test('UpdateUser without authtoken', async () => {
    const updatedEmail = `${randomName()}@updated.com`;
    const updatedPassword = `${randomName()}`;

    const updateRes = await request(app)
        .put(`/api/auth/${testUserId}`)
        .send({ email: updatedEmail, password: updatedPassword});

    expect(updateRes.status).toBe(401);
});

test('UpdateUser without expired token', async () => {
    const expiredToken = jwt.sign({ id: testUserId }, config.jwtSecret, { expiresIn: '-10s' });

    const res = await request(app)
        .put(`/api/auth/${testUserId}`)
        .set("Authorization", `Bearer ${expiredToken}`)
        .send({ email: "shouldfail@example.com" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("unauthorized");
});
