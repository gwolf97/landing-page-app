import dotenv from "dotenv"
import sgMail from '@sendgrid/mail'
import sgClient from '@sendgrid/client'
import express from 'express'
import expressFileUpload from 'express-fileupload'

const app = express();

dotenv.config()

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgClient.setApiKey(process.env.SENDGRID_API_KEY);

app.use(express.urlencoded({
 extended: true
}));
app.use(express.json());
app.use(expressFileUpload());
app.set('view engine', 'ejs');


// Routes

app.get('/signup', (req, res) => {
    res.render('form', signUpPage);
});

app.post('/signup', async (req, res) => {
    const confNum = randNum();
 const params = new URLSearchParams({
   conf_num: confNum,
   email: req.body.email,
 });
 const confirmationURL = req.protocol + '://' + req.headers.host + '/confirm/?' + params;
 const msg = {
   to: req.body.email,
   from: 'SENDER_EMAIL', // Change to your verified sender
   subject: `Confirm your subscription to our newsletter`,
   html: `Hello ${req.body.firstname},<br>Thank you for subscribing to our newsletter. Please complete and confirm your subscription by <a href="${confirmationURL}"> clicking here</a>.`
 }
   await addContact(req.body.firstname, req.body.lastname, req.body.email, confNum);
   await sgMail.send(msg);
   res.render('message', { message: 'Thank you for signing up for our newsletter! Please complete the process by confirming the subscription in your email inbox.' });
});

app.get('/confirm', async (req, res) => {
    try {
        const contact = await getContactByEmail(req.query.email);
        if(contact == null) throw `Contact not found.`;
        if (contact.custom_fields.conf_num ==  req.query.conf_num) {
          const listID = await getListID('Newsletter Subscribers');
          await addContactToList(req.query.email, listID);
        } else {
          throw 'Confirmation number does not match';
        }
        res.render('message', { message: 'You are now subscribed to our newsletter. We can\'t wait for you to hear from us!' });
      } catch (error) {
        console.error(error);
        res.render('message', { message: 'Subscription was unsuccessful. Please <a href="/signup">try again.</a>' });
      }
});

app.get('/upload', (req, res) => {
});

app.post('/upload', async (req, res) => {

});

app.get('/delete', async (req, res) => {

});


// Helper functions and variables

const signUpPage = {
    title: 'Join Our Newsletter',
    subtitle: 'Subscribe to our newsletter to receive the latest news and products.',
    form: `<form action="/signup" id="contact-form" method="post" style="margin: 10%; margin-left:5%; width: 350px;">
        <div class="form-group">
            <label for="firstname">First Name</label>
            <input type="text" class="form-control" id="firstname" name="firstname" placeholder="First Name" required>
        </div>
        <div class="form-group">
            <label for="lastname">Last Name</label>
            <input class="form-control" id="lastname" name="lastname" placeholder="Last Name" required>
        </div>
        <div class="form-group">
            <label for="email">Email address</label>
            <input type="email" class="form-control" id="email" name="email" placeholder="Enter email" required>
            <small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.</small>
        </div>
        <button type="submit" style="background:#0263e0 !important;" class="btn btn-primary">Subscribe</button>
    </form>`
   };
   
   function randNum() {
    return Math.floor(Math.random() * 90000) + 10000;
   }
   
   async function addContact(firstName, lastName, email, confNum) {
    const customFieldID = await getCustomFieldID('conf_num');
    const data = {
      "contacts": [{
        "email": email,
        "first_name": firstName,
        "last_name": lastName,
        "custom_fields": {}
      }]
    };
    data.contacts[0].custom_fields[customFieldID] = confNum;
    const request = {
      url: `/v3/marketing/contacts`,
      method: 'PUT',
      body: data
    }
    return sgClient.request(request);
   }
   
   async function getCustomFieldID(customFieldName) {
    const request = {
      url: `/v3/marketing/field_definitions`,
      method: 'GET',
    }
    const response = await sgClient.request(request);
    const allCustomFields = response[1].custom_fields;
    return allCustomFields.find(x => x.name === customFieldName).id;
   }

   async function getContactByEmail(email) {
    const data = {
      "emails": [email]
    };
    const request = {
      url: `/v3/marketing/contacts/search/emails`,
      method: 'POST',
      body: data
    }
    const response = await sgClient.request(request);
    if(response[1].result[email]) return response[1].result[email].contact;
    else return null;
   }
   
   async function getListID(listName) {
    const request = {
      url: `/v3/marketing/lists`,
      method: 'GET',
    }
    const response = await sgClient.request(request);
    const allLists = response[1].result;
    return allLists.find(x => x.name === listName).id;
   }
   
   async function addContactToList(email, listID) {
    const data = {
      "list_ids": [listID],
      "contacts": [{
        "email": email
      }]
    };
    const request = {
      url: `/v3/marketing/contacts`,
      method: 'PUT',
      body: data
    }
    return sgClient.request(request);
   }
   


app.listen(3000, () => {
console.log(`Listening on port 3000`);
});
