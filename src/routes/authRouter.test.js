const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testUserId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  
  const registerRes = await request(app).post('/api/auth').send(testUser);
  expect(registerRes.status).toBe(200);
  
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
  expectValidJwt(testUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('logout', async () => {
  const logoutRes = await request(app)
    .delete('/api/auth')
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');

  // Verify token is invalid after logout
  const protectedRes = await request(app)
    .put(`/api/auth/${testUserId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send({ email: 'new@email.com' });
  
  expect(protectedRes.status).toBe(401);
  expect(protectedRes.body.message).toBe('unauthorized');
});

test('update user - unauthorized access', async () => {
  const updateRes = await request(app)
    .put(`/api/auth/${testUserId}`)
    .send({ email: 'hacker@attack.com', password: 'newpass' });

  expect(updateRes.status).toBe(401);
  expect(updateRes.body.message).toBe('unauthorized');
});

test('update user - authorized access', async () => {
  expect(testUserId).not.toBeUndefined();
  expect(testUserId).not.toBeNull();
  // Ensure fresh token
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  const freshToken = loginRes.body.token;

  const newEmail = 'updated@test.com';
  
  const updateRes = await request(app)
    .put(`/api/auth/${testUserId}`)
    .set('Authorization', `Bearer ${freshToken}`)
    .send({ email: newEmail, password: 'newpass' });

  console.log("Update response:", updateRes.body);
  expect(updateRes.status).toBe(200);
  expect(updateRes.body.email).toBe(newEmail);
});

test('protected route requires authentication', async () => {
  const protectedRes = await request(app).delete('/api/auth');

  expect(protectedRes.status).toBe(401);
  expect(protectedRes.body.message).toBe('unauthorized');
});

test('registration fails with missing fields', async () => {
  const res = await request(app).post('/api/auth').send({ email: 'test@jwt.com' });
  expect(res.status).toBe(400);
  expect(res.body.message).toBe('name, email, and password are required');
});

test('login fails with incorrect password', async () => {
  const res = await request(app).put('/api/auth').send({ email: testUser.email, password: 'wrongpassword' });
  expect(res.status).toBe(401);
  expect(res.body.message).toBe('unauthorized');
});

test('accessing protected route with invalid token', async () => {
  const res = await request(app)
    .put(`/api/auth/${testUserId}`)
    .set('Authorization', 'Bearer fakeinvalidtoken')
    .send({ email: 'hacker@attack.com' });

  expect(res.status).toBe(401);
  expect(res.body.message).toBe('unauthorized');
});


test('accessing protected route with no token', async () => {
  const res = await request(app).put(`/api/auth/${testUserId}`).send({ email: 'unauth@test.com' });
  expect(res.status).toBe(401);
  expect(res.body.message).toBe('unauthorized');
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}