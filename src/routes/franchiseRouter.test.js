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
    const adminUser = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(adminUser)
    adminAuthToken = adminLoginRes.body.token;

    const addRes = await request(app).post("/api/franchise")
    .set('Content-Type', 'application/json')
    .set("Authorization", `Bearer ${adminAuthToken}`)
    .send({"name": randomName(), "admins": [{"email": adminLoginRes.body.user.email}]});

    expect(addRes.status).toBe(200);
});

test('createFranchise without proper admin permissions', async () => {
    const adminUser = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(adminUser)
    adminAuthToken = adminLoginRes.body.token;

    const addRes = await request(app).post("/api/franchise")
    .set('Content-Type', 'application/json')
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send({"name": randomName(), "admins": [{"email": adminLoginRes.body.user.email}]});

    expect(addRes.status).toBe(403);
});

test('deleteFranchise with success', async () => {
    const adminUser = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(adminUser)
    adminAuthToken = adminLoginRes.body.token;

    const addRes = await request(app).post("/api/franchise")
    .set('Content-Type', 'application/json')
    .set("Authorization", `Bearer ${adminAuthToken}`)
    .send({"name": randomName(), "admins": [{"email": adminLoginRes.body.user.email}]});
    expect(addRes.status).toBe(200);


    const delRes = await request(app).delete(`/api/franchise/${addRes.body.id}`)
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send();
    expect(delRes.status).toBe(200);
});

test('deleteFranchise without proper admin permissions', async () => {
    const adminUser = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(adminUser)
    adminAuthToken = adminLoginRes.body.token;

    const addRes = await request(app).post("/api/franchise")
    .set('Content-Type', 'application/json')
    .set("Authorization", `Bearer ${adminAuthToken}`)
    .send({"name": randomName(), "admins": [{"email": adminLoginRes.body.user.email}]});
    expect(addRes.status).toBe(200);


    const delRes = await request(app).delete(`/api/franchise/${addRes.body.id}`)
        .set("Authorization", `Bearer ${testUserAuthToken}`)
        .send();
    expect(delRes.status).toBe(403);
});

test('createStore with success', async () => {
    const adminUser = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(adminUser)
    adminAuthToken = adminLoginRes.body.token;

    const addRes = await request(app).post("/api/franchise")
    .set('Content-Type', 'application/json')
    .set("Authorization", `Bearer ${adminAuthToken}`)
    .send({"name": randomName(), "admins": [{"email": adminLoginRes.body.user.email}]});

    expect(addRes.status).toBe(200);
    
    const storeRes = await request(app).post(`/api/franchise/${addRes.body.id}/store`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send({"franchiseId": addRes.body.id, "name":addRes.body.name});

    expect(storeRes.status).toBe(200);
});

test('createStore without proper admin permissions', async () => {
    const adminUser = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(adminUser)
    adminAuthToken = adminLoginRes.body.token;

    const addRes = await request(app).post("/api/franchise")
    .set('Content-Type', 'application/json')
    .set("Authorization", `Bearer ${adminAuthToken}`)
    .send({"name": randomName(), "admins": [{"email": adminLoginRes.body.user.email}]});

    expect(addRes.status).toBe(200);
    
    const storeRes = await request(app).post(`/api/franchise/${addRes.body.id}/store`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${testUserAuthToken}`)
        .send({"franchiseId": addRes.body.id, "name":addRes.body.name});

    expect(storeRes.status).toBe(403);
});

test('deleteStore with success', async () => {
    const adminUser = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(adminUser)
    adminAuthToken = adminLoginRes.body.token;

    const addRes = await request(app).post("/api/franchise")
    .set('Content-Type', 'application/json')
    .set("Authorization", `Bearer ${adminAuthToken}`)
    .send({"name": randomName(), "admins": [{"email": adminLoginRes.body.user.email}]});

    expect(addRes.status).toBe(200);
    
    const storeRes = await request(app).post(`/api/franchise/${addRes.body.id}/store`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send({"franchiseId": addRes.body.id, "name":addRes.body.name});

    expect(storeRes.status).toBe(200);

    const delRes = await request(app)
        .delete(`/api/franchise/${addRes.body.id}/store/${storeRes.insertId}`)
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send();

    expect(delRes.status).toBe(200);
});

test('deleteStore without proper admin permissions', async () => {
    const adminUser = await createAdminUser();
    const adminLoginRes = await request(app).put('/api/auth').send(adminUser)
    adminAuthToken = adminLoginRes.body.token;

    const addRes = await request(app).post("/api/franchise")
    .set('Content-Type', 'application/json')
    .set("Authorization", `Bearer ${adminAuthToken}`)
    .send({"name": randomName(), "admins": [{"email": adminLoginRes.body.user.email}]});

    expect(addRes.status).toBe(200);
    
    const storeRes = await request(app).post(`/api/franchise/${addRes.body.id}/store`)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send({"franchiseId": addRes.body.id, "name":addRes.body.name});

    expect(storeRes.status).toBe(200);

    const delRes = await request(app)
        .delete(`/api/franchise/${addRes.body.id}/store/${storeRes.insertId}`)
        .set("Authorization", `Bearer ${testUserAuthToken}`)
        .send();

    expect(delRes.status).toBe(403);
});

test("getFranchises with success", async()=>{
    const getRes = await request(app).get("/api/franchise").send();
    expect(getRes.status).toBe(200);
  })