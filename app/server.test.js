const request = require('supertest');
const app = require('./server');

describe('GET /health', () => {
    it('should return 200 and status healthy', async () => {
        const response = await request(app).get('/health');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ status: 'healthy' });
    });
});
