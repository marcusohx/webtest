module.exports = {
  apps : [{
    name: 'test',
    script: 'app.js',
  }],

  deploy : {
    production : {
      user : 'ubuntu',
      host : 'ec2-54-185-28-76.us-west-2.compute.amazonaws.com',
      key  : '~/.ssh/test.pem',
      ref  : 'origin/master',
      repo : 'git@github.com:/marcusohx/webtest.git',
      path : '/home/ubuntu/test',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
