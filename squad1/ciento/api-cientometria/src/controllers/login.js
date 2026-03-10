const axios = require('axios');

const login = async () => {
  try {
    const response = await axios.post('http://localhost:5001/api/login', {
      username: 'admin',
      password: 'password123'
    });
    console.log(response.data.accessToken);
  } catch (error) {
    console.error('Error logging in:', error.response ? error.response.data : error.message);
  }
};

login();
