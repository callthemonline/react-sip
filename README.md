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
// optional: autoRegister, sipDebug, iceServerUrls, extraHeaders, sessionTimersExpires, autoAnswer

ReactDOM.render(
  <SipProvider
    host={sipHost}
    port={sipPort}
    user={sipUser}
    password={sipPassword}
    autoRegister={sipRegister} // enable/disable REGISTER, default: true, see jssip.ua option `register`
    debug={sipDebug} // true / false
    autoAnswer={autoAnswer} // automatically answer incoming sessions, default: false
    sessionTimersExpires={sessionTimersExpires} // Min-SE: value, default set to 120, not 90
    debug={debug} // true / false
    extraHeaders={[ 'X-Foo: foo', 'X-Bar: bar' ]} // optional: extra headers
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
sipRegister: PropTypes.func
sipUnregister: PropTypes.func
sipAnswer: PropTypes.func
callStatus: PropTypes.string
callDirection: PropTypes.string
```

`sipStatus` displays SIP connection status and can be: `DISCONNECTED, CONNECTING, CONNECTED, REGISTERED, ERROR`

`callStatus` represents the status of the actual established voice call/session, and can be: `IDLE, ACTIVE, STARTING, STOPPING`

`callDirection` indicates the direction of the call: `INCOMING, OUTGOING`

_(These can be used to more intuitively display components)_

`sipStart(destination), sipStop(), sipAnswer()` are functions to manage the call.

You can also `sipRegister()` and `sipUnregister()` manually when `autoRegister` is set to `false` for advanced registration scenarios.

Sample context usage
---

<details>

```js
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';
import { withState, compose, withHandlers, getContext, withPropsOnChange } from 'recompose';
import { CALL_STATUS_IDLE,
  CALL_STATUS_STARTING,
  CALL_STATUS_ACTIVE,
  CALL_STATUS_STOPPING,
  CALL_DIRECTION_INCOMING,
  CALL_DIRECTION_OUTGOING } from 'react-sip';

const Wrapper = styled.div`background:yellow`;
const InputContainer = styled.div`background:green`;
const ButtonContainer = styled.div`background:red`;

const DialController = ({
  onStartButtonClick,
  onStopButtonClick,
  onAnswerButtonClick,
  startButtonDisabled,
  stopButtonDisabled,
  answerButtonDisabled,
  destinationText,
  onDestinationTextChange,
}) => (
  <Wrapper >
<h1>Zvonilka.</h1>
<InputContainer>
<TextField
      hintText="Number"
      value = {destinationText}
      onChange = {onDestinationTextChange}
    />
</InputContainer>
<ButtonContainer>

<RaisedButton label="Call" disabled={startButtonDisabled} onClick={onStartButtonClick}/>
<RaisedButton label="Answer" disabled={answerButtonDisabled} onClick={onAnswerButtonClick}/>
<RaisedButton label="Stop" disabled={stopButtonDisabled} onClick={onStopButtonClick}/>

</ButtonContainer>
</Wrapper>
);

export default compose (
  withState('destinationText', 'setDestinationText', '42'),
  getContext({
    sipStart: PropTypes.func,
    sipAnswer: PropTypes.func,
    sipStop: PropTypes.func,
    callStatus: PropTypes.string,
    callDirection: PropTypes.string,
  }),
  withPropsOnChange(
    ['callStatus', 'callDirection'],
    ({ callStatus, callDirection }) => ({
      startButtonDisabled: callStatus != CALL_STATUS_IDLE,
      stopButtonDisabled: callStatus != CALL_STATUS_ACTIVE && callStatus != CALL_STATUS_STARTING,
      answerButtonDisabled: callStatus != CALL_STATUS_STARTING || callDirection != CALL_DIRECTION_INCOMING,
    })
),
  withHandlers({
    onDestinationTextChange: ({setDestinationText}) => (e) => setDestinationText(e.currentTarget.value),
    onStopButtonClick: ({sipStop}) => (e) => sipStop(),
    onStartButtonClick: ({sipStart, destinationText}) => (e) => sipStart(destinationText),
    onAnswerButtonClick: ({sipAnswer}) => (e) => sipAnswer(),
  }),
)(DialController);
```
</details>
