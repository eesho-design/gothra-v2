const { app } = require('./netlify/functions/api');
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Gothra Express Server running on port ${port}`);
});
