const app = require('../app');
const request = require('supertest');
const mongoose = require('mongoose');
const User = require('./model');

const testAccountEmail = `create-user@bken.io`;
const testAccountPassword = Math.random()
  .toString(36)
  .slice(2);

beforeAll(async () => {
  await mongoose.connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: false,
  });

  await User.deleteOne({ email: testAccountEmail });
});

afterAll(async () => {
  await User.deleteOne({ email: testAccountEmail });
  await mongoose.connection.close();
});

describe('user tests', () => {
  it('should fail registration if beta code is invalid', async () => {
    const registerUserQuery = `
      mutation registerUser {
        registerUser(
          input: {
            displayName: "Test User"
            email: "${testAccountEmail}"
            password: "${testAccountPassword}"
            code: "123"
          }
        ) {
          accessToken
        }
      }
    `;

    const res = await request(app)
      .post('/graphql')
      .send({ query: registerUserQuery });
    expect(res.body.errors[0].message).toEqual('bad beta code');
  });

  it('should register user', async () => {
    const registerUserQuery = `
      mutation registerUser {
        registerUser(
          input: {
            displayName: "Test User"
            email: "${testAccountEmail}"
            password: "${testAccountPassword}"
            code: "${process.env.BETA_CODE}"
          }
        ) {
          accessToken
        }
      }
    `;

    const res = await request(app)
      .post('/graphql')
      .send({ query: registerUserQuery });

    expect(res.body.errors).toEqual(undefined);
    expect(res.body.data.registerUser.accessToken).toBeDefined();
  });

  it('should fail registration if user exists', async () => {
    const registerUserQuery = `
      mutation registerUser {
        registerUser(
          input: {
            displayName: "Test User"
            email: "${testAccountEmail}"
            password: "${testAccountPassword}"
            code: "${process.env.BETA_CODE}"
          }
        ) {
          accessToken
        }
      }
    `;

    const res = await request(app)
      .post('/graphql')
      .send({ query: registerUserQuery });

    expect(res.body.errors[0].message).toEqual('user already exists');
  });

  it('should login user', async () => {
    const loginUserQuery = `
      {
        login(input: {
          email: "${testAccountEmail}"
          password: "${testAccountPassword}"
        }) {
          accessToken
        }
      }
    `;

    const res = await request(app)
      .post('/graphql')
      .send({ query: loginUserQuery });
    expect(res.body.errors).toEqual(undefined);
    expect(res.body.data.login.accessToken).toBeDefined();
  });

  it('should return user', async () => {
    const { _id } = await User.findOne({ email: testAccountEmail });
    const id = _id.toString();

    const userQuery = `
      {
        user(id: "${id}") {
          id
          email
          avatar
          followers
          displayName
        }
      }
    `;

    const res = await request(app)
      .post('/graphql')
      .send({ query: userQuery });
    expect(res.body.data).toEqual({
      user: {
        id,
        email: testAccountEmail,
        avatar:
          'https://s3.us-east-2.wasabisys.com/media-bken/files/avatar.jpg',
        followers: 0,
        displayName: 'Test User',
      },
    });
  });
});
