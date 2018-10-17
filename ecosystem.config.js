module.exports = {
  apps: [{
    name: 'webapp',
    script: './app.js'
  }],
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'ec2-54-185-28-76.us-west-2.compute.amazonaws.com',
      key: '~/.ssh/webapp.pem',
      ref: 'origin/master',
      repo: 'https://github.com/marcusohx/webtest',
      path: '/home/ubuntu/webapp',
      'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js'
    }
  }
}