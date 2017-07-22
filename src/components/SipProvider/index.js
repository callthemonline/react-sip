// import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import JsSIP from 'jssip';

import {
  CONNECTED,
  DISCONNECTED,
  CONNECTING,
  REGISTERED,
  ERROR,
} from '../../lib/statuses';

let logger;
const dummyLogger = {};
dummyLogger.log = () => {};
dummyLogger.error = () => {};
dummyLogger.warn = () => {};
dummyLogger.debug = () => {};

const contactToSipIdRegex = /[a-zA-Z0-9]+@[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*/;

export default class SipProvider extends React.Component {

  static childContextTypes = {
    sipId: PropTypes.string,
    sipStatus: PropTypes.string,
    sipSessionExists: PropTypes.bool,
    sipSessionIsActive: PropTypes.bool,
    sipErrorLog: PropTypes.array,
    sipStart: PropTypes.func,
    sipStop: PropTypes.func,
  }

  static defaultProps = {
    iceServers: [],
    debug: false,
    autoAnswer: false,
  }

  static propTypes = {
    host: PropTypes.string.isRequired,
    port: PropTypes.string.isRequired,
    user: PropTypes.string.isRequired,
    password: PropTypes.string.isRequired,
    iceServers: PropTypes.array,
    debug: PropTypes.bool,
    autoAnswer: PropTypes.bool,
  }

  constructor() {
    super();
    this.state = {
      status: DISCONNECTED,
      session: null,
      incomingSession: null,
      errorLog: [],
    };

    this.mounted = false;
    this.ua = null;
    // this.stopCall = this.stopCall.bind(this);
  }

  stopCall = () => { //call stop
    this.ua.terminateSessions();
    console.log('Answer auto OFF - inside the function');
  }

  startCall = (destination) => { //call start
    console.log(this);
    const {
      iceServers,
    } = this.props;

    var options = {
      extraHeaders: [ 'X-Token: foo', 'X-Bar: bar' ],
      'mediaConstraints': {'audio': true, 'video': false},
      pcConfig: {
        iceServers,
      },
      sessionTimersExpires: 120
    };

    this.ua.call(destination, options);
  }

  getChildContext() {
    const contact = this.ua && this.ua.contact && this.ua.contact.toString();
    const sipIdRegexResult = contactToSipIdRegex.exec(contact);
    return {
      sipId: sipIdRegexResult ? sipIdRegexResult[0] : '',
      sipStatus: this.state.status,
      sipSessionExists: !!this.state.incomingSession || !!this.state.session,
      sipSessionIsActive: !!this.state.session,
      sipErrorLog: this.state.errorLog,
      sipStart: this.startCall,
      sipStop: this.stopCall,
    };
  }

  componentDidMount() {
    const {
      host,
      port,
      user,
      password,
      iceServers,
      debug,
      autoAnswer,
    } = this.props;


    // still requires page reloding after the setting has changed
    // http://jssip.net/documentation/3.0.x/api/debug/
    if (debug) {
      JsSIP.debug.enable('JsSIP:*');
      logger = console;
    } else {
      JsSIP.debug.disable('JsSIP:*');
      logger = dummyLogger;
    }



    this.remoteAudio = window.document.createElement('audio');
    window.document.body.appendChild(this.remoteAudio);

    this.mounted = true;
    const socket = new JsSIP.WebSocketInterface(`wss://${host}:${port}`);

    try {
      this.ua = new JsSIP.UA({
        uri: `sip:${user}@${host}`,
        password,
        sockets: [socket],
        //register: false,
      });
    } catch (error) {
      logger.debug('Error', error.message, error);
      this.onMount(function callback() {
        this.setState({
          status: ERROR,
          errorLog: [...this.state.errorLog, {
            message: error.message,
            time: new Date(),
          }],
        });
      });
    }

    this.ua.on('connecting', () => {
      logger.debug('UA "connecting" event');
      if (!this.mounted) {
        return;
      }
      this.setState({
        status: CONNECTING,
      });
    });

    this.ua.on('connected', () => {
      logger.debug('UA "connected" event');
      if (!this.mounted) {
        return;
      }
      this.setState({ status: CONNECTED });
    });

    this.ua.on('disconnected', () => {
      logger.debug('UA "disconnected" event');
      if (!this.mounted) {
        return;
      }
      this.setState({ status: DISCONNECTED });
    });

    this.ua.on('registered', (data) => {
      logger.debug('UA "registered" event', data);
      if (!this.mounted) {
        return;
      }
      this.setState({ status: REGISTERED });
    });

    this.ua.on('unregistered', () => {
      logger.debug('UA "unregistered" event');
      if (!this.mounted) {
        return;
      }
      if (this.ua.isConnected()) {
        this.setState({ status: CONNECTED });
      } else {
        this.setState({ status: DISCONNECTED });
      }
    });

    this.ua.on('registrationFailed', (data) => {
      logger.debug('UA "registrationFailed" event');
      if (!this.mounted) {
        return;
      }
      if (this.ua.isConnected()) {
        this.setState({ status: 'connected' });
      } else {
        this.setState({ status: 'disconnected' });
      }
      this.setState({
        status: this.ua.isConnected()
          ? CONNECTED
          : DISCONNECTED,
        errorLog: [...this.state.errorLog, {
          message: data.cause,
          time: new Date(),
        }],
      });
    });

    this.ua.on('newRTCSession', (data) => {
      logger.debug('UA "newRTCSession" event', data);
      if (!this.mounted) {
        return;
      }

      // identify call direction
      if (data.originator === 'local') {
        var callDirection = 'out';
      } else if (data.originator === 'remote') {
        var callDirection = 'in';
      }

      const {
        session: sessionInState,
        incomingSession: incomingSessionInState,
      } = this.state;
      const {
        session,
      } = data;

      // Avoid if busy or other incoming
      if (sessionInState || incomingSessionInState) {
        logger.debug('incoming call replied with 486 "Busy Here"');
        session.terminate({
          status_code: 486,
          reason_phrase: 'Busy Here',
        });
        return;
      }

      this.setState({ incomingSession: session });
      session.on('failed', () => {
        if (!this.mounted) {
          return;
        }
        this.setState({
          session: null,
          incomingSession: null,
        });
      });

      session.on('ended', () => {
        if (!this.mounted) {
          return;
        }
        this.setState({
          session: null,
          incomingSession: null,
        });
      });

      session.on('accepted', () => {
        if (!this.mounted) {
          return;
        }
        this.setState({
          session,
          incomingSession: null,
        });

        this.remoteAudio.src = window.URL.createObjectURL(session.connection.getRemoteStreams()[0]);
        this.remoteAudio.play();
      });

      if (callDirection === 'in' && autoAnswer) {
        console.log('Answer auto ON');
        session.answer({
          mediaConstraints: {
            audio: true,
            video: false,
          },
          pcConfig: {
            iceServers,
          },
        });

      } else if (callDirection === 'in' && !autoAnswer) {
        console.log('Answer auto OFF');
        this.stopCall();

      } else if (callDirection === 'out' ) {
        console.log('OUTBOUND call');
      }

    });
    this.ua.start();

  }

  componentWillUnmount() {
    delete this.remoteAudio;
    this.mounted = false;
  }

  render() {
    return this.props.children;
  }
}
