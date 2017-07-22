React SIP
=========

React wrapper for [jssip](https://github.com/versatica/JsSIP).

Installation
-----

```bash
npm install react-sip
```


Usage
-----

```js
// src/index.js
import { SipProvider } from './components/SipProvider';
import App from './components/App';

// define sipHost, sipPort, sipUser, sipPassword
// optional: register, sipDebug, iceServerUrls, extraHeaders, sessionTimersExpires, autoAnswer

ReactDOM.render(
  <SipProvider
    host={sipHost}
    port={sipPort}
    user={sipUser}
    password={sipPassword}
    register={sipRegister} // enable/disable REGISTER, default: true
    debug={sipDebug} // true / false
    autoAnswer={autoAnswer} // automatically answer incoming sessions, default: false
    sessionTimersExpires={sessionTimersExpires} // Min-SE: value, default set to 120, not 90
    debug={debug} // true / false
    extraHeaders={[ 'X-Token: foo', 'X-Bar: bar' ]} // optional: extra headers
    iceServers={[ // optional
      {
        urls: iceServerUrls,
      },
    ]}
  >
    <App />
  </SipProvider>
  document.getElementById('root'),
);
```

Child components get access to this context:

```yaml
sipId: PropTypes.string
sipStatus: PropTypes.string
sipErrorLog: PropTypes.array
sipStart: PropTypes.func
sipStop: PropTypes.func
sipAnswer: PropTypes.func
rtcSessionExists: PropTypes.bool
callStatus: PropTypes.string
callDirection: PropTypes.string
```
