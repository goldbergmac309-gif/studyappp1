import axios from 'axios';
import { exec } from 'child_process';

describe('Auth Flow (e2e)', () => {
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const password = 'password123';
  const baseURL = 'http://localhost:3000';

  it('should sign up a new user', async () => {
    try {
      const response = await axios.post(`${baseURL}/auth/signup`, {
        email: uniqueEmail,
        password: password,
      });
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('user');
      console.log('✅ Signup successful');
    } catch (error) {
      console.error('Signup failed:', error.response?.data || error.message);
      throw error;
    }
  });

  it('should log in the new user', async () => {
    try {
      const response = await axios.post(`${baseURL}/auth/login`, {
        email: uniqueEmail,
        password: password,
      });
      expect(response.status).toBe(200);
      console.log('✅ Login with correct credentials successful');
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      throw error;
    }
  });

  it('should fail to log in with incorrect password', async () => {
    try {
      await axios.post(`${baseURL}/auth/login`, {
        email: uniqueEmail,
        password: 'wrongpassword',
      });
    } catch (error) {
      expect(error.response.status).toBe(401);
      console.log('✅ Login with incorrect credentials failed as expected');
    }
  });
});
