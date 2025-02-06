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
  testUserEmail = registerRes.body.user.email;
  expectValidJwt(testUserAuthToken);
});

test('getMenu with success', async () => {
  const menuRes = await request(app).get('/api/order/menu');
  expect(menuRes.status).toBe(200);
  expect(Array.isArray(menuRes.body)).toBe(true);
});

test('addMenuItem with success', async () => {
  const testAdminUser = await createAdminUser();
  const adminLoginRes = await request(app).put('/api/auth').send(testAdminUser)
  adminAuthToken = adminLoginRes.body.token;

  const item = {title: randomName(), description: randomName(), image: "pizza1.png", price: 0.0001};

  const addRes = await request(app).put('/api/order/menu')
    .set('Content-Type', 'application/json')
    .set("Authorization", `Bearer ${adminAuthToken}`)
    .send(item);

  expect(addRes.status).toBe(200);
});

test('addMenuItem without proper admin permission', async () => {
  const secondUser = await createDinerUser();
  const secondUserLoginRes = await request(app).put('/api/auth').send(secondUser)
  let secondUserAuthToken = secondUserLoginRes.body.token;

  const item = {title: randomName(), description: randomName(), image: "pizza1.png", price: 0.0001};

  const addRes = await request(app).put('/api/order/menu')
    .set('Content-Type', 'application/json')
    .set("Authorization", `Bearer ${secondUserAuthToken}`)
    .send(item);
  expect(addRes.status).toBe(403);
});

test('createOrder with success', async () => {
  const testAdminUser = await createAdminUser();
  const adminLoginRes = await request(app).put('/api/auth').send(testAdminUser)
  adminAuthToken = adminLoginRes.body.token;

  const originalTitle = randomName();
  const originalDescription = randomName();
  const item = {title: originalTitle, description: originalDescription, image: "pizza1.png", price: 0.0001};
  const addRet = await DB.addMenuItem(item);

  // const testFranchise = {name: randomName(), admins: [{email: adminLoginRes.body.email}]};
  const testFranchise = {"name": randomName(), "admins": [{"email": testUserEmail}]};
  const createFranchiseRet = await DB.createFranchise(testFranchise);

  const testStore = { franchiseId: createFranchiseRet.id, name: randomName() };
  const createStoreRet = await DB.createStore(createFranchiseRet.id, testStore);

  const menuItem = {
    menuId: addRet.id, 
    description: addRet.description, 
    price: addRet.price
  };

  const order = {
    franchiseId: createFranchiseRet.id, 
    storeId: createStoreRet.id, 
    items: [menuItem]
  };

  const orderRes = await request(app).post('/api/order')
  .set("Content-Type", "application/json")
  .set("Authorization", `Bearer ${adminAuthToken}`)
  .send(order);

  expect(orderRes.status).toBe(200);
});

test('createOrder without proper order', async () => {
  const testAdminUser = await createAdminUser();
  const adminLoginRes = await request(app).put('/api/auth').send(testAdminUser)
  adminAuthToken = adminLoginRes.body.token;

  const menuItem = {
    menuId: undefined, 
    description: undefined, 
    price: undefined
  };

  const order = {
    franchiseId: undefined, 
    storeId: undefined, 
    items: menuItem
  };

  const orderRes = await request(app).post('/api/order')
  .set("Content-Type", "application/json")
  .set("Authorization", `Bearer ${adminAuthToken}`)
  .send(order);

  expect(orderRes.status).toBe(500);
});