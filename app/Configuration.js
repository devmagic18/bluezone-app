/*
 * @Project Bluezone
 * @Author Bluezone Global (contact@bluezone.ai)
 * @Createdate 04/26/2020, 16:36
 *
 * This file is part of Bluezone (https://bluezone.ai)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

import AsyncStorage from '@react-native-community/async-storage';
import axios from 'axios';
// import moment from 'moment';
import PushNotification from 'react-native-push-notification';
import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import Service from './apis/service';
import {
  hasNotifySystem,
  // NOTIFY_INVITE_NUMBER,
} from './utils/notifyConfiguration';

const DOMAIN = 'https://apibz.bkav.com';

// CONST
const TIME_RETRY = [2000, 3000, 5000, 8000, 13000, 21000, 34000, 55000];
let CURRENT_RETRY = 0;
let timerRegister;
let CURRENT_RETRY_UPDATE_TOKEN_FCM = 0;
let timerUpdateToken;
// const TypeOS = Platform.OS === 'android' ? 1 : 2;
let UPDATE_TOKEN_FIREBASE_RUNNING = false;
let REGISTER_USER_RUNNING = false;
const filePath = RNFS.ExternalStorageDirectoryPath + '/Bluezone/.id';
const validDateRegx = /^[0-9A-Za-z]{6}$/;

// Create UserCode in JS
// const generateRandom = () => {
//   var szCharSet =
//     '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
//   var nSizeCharSet = szCharSet.length;
//   var UserCode = '';
//
//   global.Math.seedrandom(new Date().getTime());
//
//   for (var i = 0; i < 6; i++) {
//     UserCode += szCharSet.charAt(
//       global.Math.floor(global.Math.random() * nSizeCharSet),
//     );
//   }
//
//   return UserCode;
// };

const validateUserCode = id => validDateRegx.test(id);

const getUserIdFromFile = async onResult => {
  RNFS.exists(filePath)
    .then(result => {
      if (result) {
        RNFS.readFile(filePath, 'utf8')
          .then(value => {
            onResult(value);
          })
          .catch(() => onResult());
      } else {
        onResult();
      }
    })
    .catch(() => onResult());
};

const saveUserToFile = UserCode => {
  RNFS.writeFile(filePath, UserCode, 'utf8')
    .then(success => {
      console.log('WRITEN ID TO FILE SUCCES!');
    })
    .catch(err => {
      console.log('WRITEN ID TO FILE ERROR:' + err.message);
    });
};

const createUserCode = async () => {
  const UserCode = await Service.generatorId();
  return UserCode;
};

const configuration = {
  LinkQRAndroid:
    'https://play.google.com/store/apps/details?id=com.mic.bluezone',
  LinkQRIOS: 'https://apps.apple.com/us/app/bluezone/id1508062685?ls=1',
  LinkShareAndroid:
    'https://play.google.com/store/apps/details?id=com.mic.bluezone',
  LinkShareIOS: 'https://apps.apple.com/us/app/bluezone/id1508062685?ls=1',
  Introduce: 'https://bluezone.vn',
  TimeSaveLog: 10000,
  TimeShowLog: 30000,
  RssiThreshold: -69,
  PeriodDay: 14,
  DbMaxRow: 100000,
  DbMaxDay: 180,
  ScanBleRun: 25000,
  ScanBleSleep: 95000,
  BroadcastBleRun: 15000,
  BroadcastBleSleep: 15000,
  ScanDevicesRun: 25000,
  ScanDevicesSleep: 95000,
  Beta: true,
  ShareAppText: 'Chia sẻ ứng dụng',
  ShareMessageText:
    'Bluezone: \n\nPhiên bản IOS: {LinkShareIOS} \n\nPhiên bản Android: {LinkShareAndroid}',
  NOTIFI_BLE_IOS_TEXT:
    'Bluezone không thể ghi nhận các "tiếp xúc gần" vì thiết bị chưa Bật Bluetooth.\n\nBluezone sử dụng Bluetooth năng lượng thấp BLE. Công nghệ này không tốn pin ngay cả khi luôn bật.\n\nBạn cần bật Bluetooth bằng cách vào Bảng điều khiển hoặc vào Cài đặt để cấu hình.',
  NOTIFI_PERMISSION_BLE_IOS_TEXT:
    'Bluezone sử dụng Bluetooth năng lượng thấp BLE để ghi nhận những người "tiếp xúc gần" với bạn. Công nghệ này không tốn pin ngay cả khi luôn bật.\n\nBạn cần đồng ý bật Bluetooth để có thể ghi nhận các "tiếp xúc gần".',
  NOTIFI_PERMISSION_TEXT:
    'Bạn cần đồng ý cấp quyền thông báo để ứng dụng có thể gửi cảnh báo nếu bạn "tiếp xúc gần" người nhiễm COVID-19 trong tương lai.',
  NOTIFI_PERMISSION_LOCATION_ANDROID_TEXT:
    'Bluezone không sử dụng vị trí của thiết bị. Bluezone chỉ bật Bluetooth năng lượng thấp BLE để ghi nhận các "tiếp xúc gần".\n\nMặc dù vậy, theo chính sách của Google, khi bật Bluetooth BLE thiết bị sẽ tự động đề nghị truy cập vị trí thiết bị, ngay cả khi Bluezone không sử dụng tới quyền đó.\n\nBạn cần cấp quyền để có thể ghi nhận các "tiếp xúc gần',
  NOTIFI_LOCATION_ANDROID_TEXT:
    'Bluezone không thể ghi nhận các "tiếp xúc gần" vì thiết bị chưa Bật vị trí.\n\nBluezone chỉ sử dụng Bluetooth năng lượng thấp BLE để ghi nhận các "tiếp xúc gần". Tuy nhiên, theo chính sách của Google, khi bật Bluetooth BLE thiết bị sẽ tự động đề nghị truy cập vị trí thiết bị, ngay cả khi Bluezone không sử dụng tới quyền đó.\n\nBạn cần cấp quyền Bật vị trí để có thể ghi nhận các "tiếp xúc gần".',
  NOTIFI_PERMISSION_WRITE_FILE_TEXT:
    'Bluezone chỉ sử dụng quyền "truy cập tệp" để ghi lịch sử "tiếp xúc gần" lên bộ nhớ thiết bị.\n\nMặc dù vậy, theo chính sách của Google, thiết bị vẫn tự động đề nghị "cho phép truy cập vào ảnh, phương tiện và tệp" ngay cả khi Bluezone không sử dụng các quyền còn lại.\n\nBạn cần cấp quyền để có thể ghi nhận các "tiếp xúc gần".',
  NOTIFI_BLUETOOTH_ANDROID_TEXT:
    'Bluezone không thể ghi nhận các "tiếp xúc gần" vì thiết bị chưa Bật Bluetooth.\n\nBluezone sử dụng Bluetooth năng lượng thấp BLE. Công nghệ này không tốn pin ngay cả khi luôn bật.\n\nBạn cần bật Bluetooth bằng cách vào Bảng điều khiển hoặc vào Cài đặt để cấu hình.',
  NOTIFI_PERMISSION_BLOCK_LOCATION_ANDROID_TEXT:
    'Bluezone không thể ghi nhận các "tiếp xúc gần" vì thiết bị chưa Bật vị trí.\n\nBluezone chỉ sử dụng Bluetooth năng lượng thấp BLE để ghi nhận các "tiếp xúc gần". Tuy nhiên, theo chính sách của Google, khi bật Bluetooth BLE thiết bị sẽ tự động đề nghị truy cập vị trí thiết bị, ngay cả khi Bluezone không sử dụng tới quyền đó.\n\nBạn cần cấp quyền Bật vị trí bằng cách vào "Cài đặt / Ứng dụng / Bluezone / Quyền"',
  NOTIFI_PERMISSION_WRITE_FILE_BLOCK_TEXT:
    'Bluezone không thể ghi nhận các "tiếp xúc gần" vì thiết bị chưa Bật quyền truy cập tệp\n\nMặc dù vậy, theo chính sách của Google, thiết bị vẫn tự động đề nghị "cho phép truy cập vào ảnh, phương tiện và tệp" ngay cả khi Bluezone không sử dụng các quyền còn lại.\n\nBạn cần cấp quyền Bật lưu trữ bằng cách vào "Cài đặt / Ứng dụng / Bluezone / Quyền"',
  UserCode: '',
  Token: '',
  TokenFirebase: '',
  TimeEnableBluetooth: 300000,
  BatteryEnableBluetooth: 15,
  Notifications: [],
  PermissonNotificationsAndroid: [],
  PermissonNotificationsIos: [],
};

const getConfigurationAsync = async () => {
  AsyncStorage.multiGet(['Token', 'Configuration', 'TokenFirebase']).then(
    results => {
      let keys = {};
      results.forEach(result => {
        Object.assign(keys, {[result[0]]: result[1]});
      });

      const {Token, Configuration, TokenFirebase} = keys;
      const configObject = JSON.parse(Configuration || '{}');

      mergeConfiguration(configObject, Token, TokenFirebase);
    },
  );
};

const mergeConfiguration = (configObject, Token, TokenFirebase) => {
  Object.assign(configuration, configObject, {
    Token: Token || '',
    TokenFirebase: TokenFirebase || '',
  });
};

const getUserCodeAsync = async () => {
  const UserCode = await AsyncStorage.getItem('UserCode');
  if (validateUserCode(UserCode)) {
    Service.setUserId(UserCode);
    Object.assign(configuration, {
      UserCode: UserCode,
    });
    Platform.OS !== 'ios' && saveUserToFile(UserCode);
  } else {
    // Service.restoreDb();
    getUserIdFromFile(getUserIdFromFileCallback);
  }
};

const getUserIdFromFileCallback = async userCodeFromFile => {
  const userCode = validateUserCode(userCodeFromFile)
    ? userCodeFromFile
    : await createUserCode();
  AsyncStorage.setItem('UserCode', userCode);
  Service.setUserId(userCode);
  Object.assign(configuration, {
    UserCode: userCode,
  });
  Platform.OS !== 'ios' && saveUserToFile(userCode);
};

function notifySchedule(notify, timestamp) {
  PushNotification.localNotificationSchedule({
    /* Android Only Properties */
    id: notify.id,
    largeIcon: 'icon_bluezone_null',
    smallIcon: 'icon_bluezone_service',
    bigText: notify.bigText,
    subText: notify.subText,
    vibrate: true,
    importance: notify.importance,
    priority: notify.priority,
    allowWhileIdle: false,
    ignoreInForeground: false,

    /* iOS only properties */
    alertAction: 'view',
    category: '',
    userInfo: {
      id: notify.id,
    },

    /* iOS and Android properties */
    title: notify.title,
    message: notify.message,
    playSound: false,
    number: notify.number,
    date: new Date(timestamp),
  });
}

const createNofityInvice = (config, firstTime) => {
  const newNotifys = config.Notifications || [];
  const oldNotifys = configuration.Notifications || [];

  newNotifys.forEach(notify => {
    const tf = oldNotifys.find(item => item.id === notify.id);
    if (tf) {
      return;
    }
    const timeSchedule = hasNotifySystem(notify, firstTime);
    if (timeSchedule) {
      notifySchedule(notify, timeSchedule);
    }
  });

  oldNotifys.forEach(notify => {
    const tf = newNotifys.find(item => item.id === notify.id);
    if (tf) {
      return;
    }

    // Xoa notify
    PushNotification.cancelLocalNotifications({id: notify.id});
  });
};

const removeNotifyPermisson = () => {
  const notifications =
    Platform.OS === 'ios'
      ? configuration.PermissonNotificationsIos
      : configuration.PermissonNotificationsAndroid;
  if (!notifications || notifications.length === 0) {
    return;
  }
  notifications.forEach(notify => {
    notify.id && PushNotification.cancelLocalNotifications({id: notify.id});
  });
};

const createNotifyPermisson = () => {
  const notifications =
    Platform.OS === 'ios'
      ? configuration.PermissonNotificationsIos
      : configuration.PermissonNotificationsAndroid;
  if (!notifications || notifications.length === 0) {
    return;
  }

  notifications.forEach(notify => {
    if (
      !notify.repeatTime ||
      notify.repeatTime < 0 ||
      !notify.dayStartTime ||
      notify.dayStartTime < 0
    ) {
      return;
    }

    let iDate = new Date().setHours(0, 0, 0, 0) + notify.dayStartTime;
    if (iDate < new Date().getTime()) {
      iDate += 86400000;
    }

    PushNotification.localNotificationSchedule({
      /* Android Only Properties */
      id: notify.id,
      largeIcon: 'icon_bluezone_null',
      smallIcon: 'icon_bluezone_service',

      bigText: notify.bigText,
      subText: notify.subText,
      vibrate: true,
      importance: notify.importance,
      priority: notify.priority,
      allowWhileIdle: false,
      ignoreInForeground: false,

      /* iOS only properties */
      alertAction: 'view',
      category: '',
      userInfo: {
        id: notify.id,
      },

      /* iOS and Android properties */
      title: notify.title,
      message: notify.message,
      playSound: false,
      number: notify.number,
      repeatType: 'time',
      repeatTime: notify.repeatTime,
      date: new Date(iDate),
    });
  });
};

// API lấy thông tin config .
const getConfigurationAPI = async (successCb, errorCb) => {
  // Option gửi server.
  const options = {
    method: 'GET',
    url: `${DOMAIN}/api/App/GetConfigApp`,
    timeout: 3000,
  };
  await axios(options).then(
    async response => {
      if (response && response.status === 200) {
        try {
          const data = response.data.Object;
          const firstTimeAsync = await AsyncStorage.getItem('firstTimeOpen');
          let firstTime = firstTimeAsync
            ? Number.parseInt(firstTimeAsync, 10)
            : null;

          if (!firstTime) {
            firstTime = new Date().getTime();
            await AsyncStorage.setItem('firstTimeOpen', firstTime.toString());
          }

          await createNofityInvice(data, firstTime);
          removeNotifyPermisson(data);

          // Cập nhật thông tin configuration.
          Object.assign(configuration, data);

          successCb(configuration);

          // Lưu lại thông tin cấu hình.
          const configString = JSON.stringify(data);
          AsyncStorage.setItem('Configuration', configString);

          Service.setConfig(data);
        } catch (e) {
          errorCb(configuration);
        }
      }
    },
    async error => {
      errorCb(error);
    },
  );
};

// Lưu thông tin Token
const setToken = Token => {
  Object.assign(configuration, {Token});
  AsyncStorage.setItem('Token', Token); // TODO by NhatPA: Đang xảy ra trường hợp null
};

// Lưu thông tin TokenFirebase
const setTokenFirebase = TokenFirebase => {
  if (
    configuration.TokenFirebase !== '' &&
    TokenFirebase === configuration.TokenFirebase
  ) {
    return;
  }
  console.log('TokenFirebase', TokenFirebase);
  if (configuration.Token === '') {
    registerUser(TokenFirebase);
  } else {
    updateTokenFirebase(TokenFirebase);
  }
};

const registerUser = async TokenFirebase => {
  if (REGISTER_USER_RUNNING || configuration.Token) {
    return;
  }
  REGISTER_USER_RUNNING = true;
  // Check nếu đang setTimeOut mà vào app ở trạng thái forground thì clearTimeout.
  if (timerRegister) {
    CURRENT_RETRY = 0;
    clearTimeout(timerRegister);
  }

  // const {UserCode} = configuration;
  // Tạo gói data
  // const MacBluetooth = await DeviceInfo.getMacAddress(); // Android, ios: 00: 22, ios 7 , android , ios => sinh GUUI khác nhau
  // const MacBluetooth = '00:00:00:00:00'; // Android, ios: 00: 22, ios 7 , android , ios => sinh GUUI khác nhau
  const options = {
    method: 'post',
    data: {
      // UserCode: UserCode,
      TokenFirebase: TokenFirebase,
      // TypeOS: TypeOS,
      // MacBluetooth: MacBluetooth,
    },
    url: `${DOMAIN}/api/App/RegisterUser`,
  };

  axios(options).then(
    response => {
      REGISTER_USER_RUNNING = false;
      if (response && response.status === 200) {
        const {Token} = response.data.Object;

        timerRegister && clearTimeout(timerRegister);
        // Luu lai token
        setToken(Token);

        Object.assign(configuration, {TokenFirebase});
        AsyncStorage.setItem('TokenFirebase', TokenFirebase);
      }
    },
    error => {
      REGISTER_USER_RUNNING = false;
      // Start kich ban thu lai lien tuc toi khi duoc
      timerRegister && clearTimeout(timerRegister);
      if (CURRENT_RETRY < TIME_RETRY.length) {
        timerRegister = setTimeout(registerUser, TIME_RETRY[CURRENT_RETRY]);
        CURRENT_RETRY++;
      } else {
        CURRENT_RETRY = 0;
      }
    },
  );
};

const updateTokenFirebase = TokenFirebase => {
  if (UPDATE_TOKEN_FIREBASE_RUNNING) {
    return;
  }
  UPDATE_TOKEN_FIREBASE_RUNNING = true;
  // const {UserCode, Token} = configuration;

  // Option gửi server.
  const options = {
    method: 'post',
    data: {
      // UserCode: UserCode,
      // Token: Token,
      TokenFirebase: TokenFirebase,
      // TypeOS: TypeOS,
    },
    url: `${DOMAIN}/api/App/UpdateTokenFirebase`,
  };

  axios(options).then(
    response => {
      UPDATE_TOKEN_FIREBASE_RUNNING = false;
      if (response && response.status === 200) {
        timerUpdateToken && clearTimeout(timerUpdateToken);
      }
    },
    error => {
      UPDATE_TOKEN_FIREBASE_RUNNING = false;
      timerUpdateToken && clearTimeout(timerUpdateToken);
      if (CURRENT_RETRY_UPDATE_TOKEN_FCM < TIME_RETRY.length) {
        timerUpdateToken = setTimeout(
          updateTokenFirebase,
          TIME_RETRY[CURRENT_RETRY_UPDATE_TOKEN_FCM],
        );
        CURRENT_RETRY_UPDATE_TOKEN_FCM++;
      } else {
        CURRENT_RETRY_UPDATE_TOKEN_FCM = 0;
      }
    },
  );
};

const getConfig = () => {
  return configuration;
};

export default configuration;
export {
  setTokenFirebase,
  setToken,
  getConfigurationAPI,
  getConfigurationAsync,
  getUserCodeAsync,
  getConfig,
  registerUser,
  removeNotifyPermisson,
  createNotifyPermisson,
  DOMAIN,
};
