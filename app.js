// Modules.
var express = require('express')
	, http = require('http')
	, https = require('https')
	, path = require('path')
	, fs = require('fs')
	, prompt = require('prompt')
	, growl = require('growl')
	;

var settingsFile = path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.github_notification');
var settings = false;
var intervalID;
var lastCheck;

try
{
	settings = JSON.parse(fs.readFileSync(settingsFile) || 'false');
}
catch (err)
{
	// Ignore it if the file does not exist.
}

if (settings)
{
	start();
}
else
{
	prompt.start();
	prompt.message = 'GitHub';
	prompt.delimiter = ' ';
	prompt.get([
		{ name: 'username', required: true },
		{ name: 'password', hidden: true, required: true },
		{ name: 'seconds', default: 60, required: false }
	], function(err, result)
	{
		if (err)
		{
			return onErr(err);
		}
		settings = result;

		settings.seconds = +settings.seconds;
		if (settings.seconds <= 10)
		{
			return onErr('interval must be a valid number of seconds, >= 10.');
		}

		fs.writeFile(settingsFile, JSON.stringify(settings), function(err)
		{
			if (err)
			{
				return onErr(err);
			}
		});
		start();
	});
}

function start()
{
	check();
	intervalID = setInterval(check, settings.seconds * 1000);
}


function onErr(err)
{
	console.error(err);
	intervalID && clearInterval(intervalID);
	process.exit(0);
}


function check()
{
	var auth = 'Basic ' + new Buffer(settings.username + ':' + settings.password).toString('base64');

	var headers = { Authorization: auth };
	if (lastCheck)
	{
		headers['If-Modified-Since'] = lastCheck;
	}
	var req = https.request({
		host: 'api.github.com',
		port: 443,
		path: '/notifications',
		method: 'GET',
		headers: headers
	}, function(res)
	{
		var output = '';
		res.setEncoding('utf8');

		res.on('data', function(chunk)
		{
			output += chunk;
		});

		res.on('end', function()
		{
			parse(res, output);
		});
	});

	req.on('error', function(err)
	{
		console.error(err);
	});

	req.end();
}

function parse(res, output)
{
	try
	{
		if (!output)
		{
			// Not modified.
			console.log('Not modified.');
			return;
		}
		var result = JSON.parse(output);
		if (result.message === 'Bad credentials')
		{
			fs.unlinkSync(settingsFile);
			return onErr(result.message);
		}
		lastCheck = res.headers.date;
		if (result.length)
		{
			for (var i = 0, iL = result.length; i < iL; i++)
			{
				var a = result[i]
					, title = a.subject.title
					, name = a.repository.full_name;
				growl(title.replace(/[^a-z0-9 ]/ig, ''), { title: name }, function(err)
				{
					err && console.error(err);
				});
			}
		}
	}
	catch (err)
	{
		console.error(err);
	}
}