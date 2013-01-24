# Description
Checks your GitHub for notifications, and sends them as Mac OS X Growls.

# Setup
Run the following in a terminal:

	> sudo gem install terminal-notifier
	> npm install
	> node app.js
	
You'll be asked once for your GitHub credentials, and a polling interval.
 
After that, your credentials will be stored in and read from ~/.github_notification.

I then leave it running in the background.