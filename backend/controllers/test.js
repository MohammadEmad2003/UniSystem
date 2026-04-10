const genericQueries = require('../utilities/genericQueries');

const userQueries = genericQueries('User', {
  primaryKey: 'User_ID'
});

const users = [
  {
    Password: "hashed_pass_1",
    F_Name: "Ahmed",
    L_Name: "Hussein",
    Email: "ahmed.hussein1@test.com",
    Account_Status: "Active",
    Role: "Student",
    Document: "doc1.pdf",
    Image_Url: "img1.jpg"
  },
  {
    Password: "hashed_pass_2",
    F_Name: "Mohamed",
    L_Name: "Amgad",
    Email: "mohamed.amgad2@test.com",
    Account_Status: "Active",
    Role: "Doctor",
    Document: "doc2.pdf",
    Image_Url: "img2.jpg"
  },
  {
    Password: "hashed_pass_3",
    F_Name: "Mazen",
    L_Name: "Ahmed",
    Email: "mazen.ahmed3@test.com",
    Account_Status: "Inactive",
    Role: "Admin",
    Document: null,
    Image_Url: null
  },
  {
    Password: "hashed_pass_4",
    F_Name: "Ali",
    L_Name: "Sayed",
    Email: "ali.sayed4@test.com",
    Account_Status: "Suspended",
    Role: "Student",
    Document: "doc4.pdf",
    Image_Url: null
  }
];

const createuser = () => {
  for (const user of users) {
    try {
      const result = userQueries.create(user);
      console.log('Inserted ID:', result.lastInsertRowid);
    } catch (err) {
      console.log('Error inserting user:', err.message);
    }
  }
};

module.exports = createuser;