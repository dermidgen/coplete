Coplete
=========

Coplete is a topic and conversation manager which focuses on a single concept; You always know who has the ball.

[coplete.com]

Dependencies
-----------
 - Nodejs
 - Redis

Node Dependencies
-----------
 - ws
 - bcrypt
 - mailer
 - redis

TODO
-----------

* Multiple Accounts with Notifications / quickly toggle between accounts
* Load only what would fit on the screen and then load more on scrolling down.
* UI Updates
* Explainer Video


Usage
-----------

I typically only need to edit socket.js, ClientSrc.js and StyleSrc.css

I run:

``` ./runServerDev.sh ```

This basically runs the server in dev mode (connecting to optional separate redis instances) and then uses uglifyjs2 and csso to minify the javascript to Client.js and CSS to Style.css. If all is good then restarting socket.js (server) should be good as well.

NOTES
-----------

The server is written to be able to use DB.R (redis read) and DB.W (redis write) for scaling across machines. PUBSUB is used to ensures messages are sent across servers to all connected sockets.


License
-----------

MIT

[coplete.com]: https://coplete.com
