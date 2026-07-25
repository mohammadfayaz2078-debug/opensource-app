import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';

function getBrowserInfo() {
  const ua = navigator.userAgent.toLowerCase();
  const isSamsung = /samsung/i.test(ua) || /samsungbrowser/i.test(ua);
  const isChrome = /chrome/i.test(ua) && !/edge|opr|samsung/i.test(ua);
  const isFirefox = /firefox/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome/i.test(ua);
  const isEdge = /edge/i.test(ua) || /edg/i.test(ua);
  const isMobile = /android|iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  return { isSamsung, isChrome, isFirefox, isSafari, isEdge, isMobile, isAndroid, isIOS };
}

function getInstallInstructions() {
  const { isSamsung, isChrome, isFirefox, isSafari, isEdge, isMobile, isAndroid, isIOS } = getBrowserInfo();

  if (isSamsung) {
    return {
      title: 'Install via Samsung Internet',
      text: 'Tap the menu icon (three lines) at the bottom-right → "Add page to" → "Add to Home screen".',
    };
  }
  if (isChrome && isMobile) {
    return {
      title: 'Install BazarNet',
      text: 'Tap the menu icon (three dots) → "Add to Home screen" or "Install App".',
    };
  }
  if (isChrome && !isMobile) {
    return {
      title: 'Install BazarNet',
      text: 'Click the install icon (➕) in the address bar, or Chrome menu → "Install BazarNet...".',
    };
  }
  if (isSafari && isIOS) {
    return {
      title: 'Install via Safari',
      text: 'Tap the Share button → "Add to Home Screen".',
    };
  }
  if (isFirefox) {
    return {
      title: 'Install via Firefox',
      text: 'Firefox supports PWA installation on Android. Tap the menu → "Install" or "Add to Home screen".',
    };
  }
  if (isEdge) {
    return {
      title: 'Install via Edge',
      text: 'Click the install icon in the address bar, or Edge menu → "Apps" → "Install this site as an app".',
    };
  }
  return {
    title: 'Install BazarNet',
    text: 'Use your browser menu and select "Add to Home Screen" or "Install App".',
  };
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);
      if (outcome === 'accepted') {
        Swal.fire({
          icon: 'success',
          title: 'Installed!',
          text: 'BazarNet has been installed on your device.',
          confirmButtonColor: '#007c89',
          confirmButtonText: 'OK',
          timer: 3000,
        });
      }
      return outcome === 'accepted';
    }

    if (isInstalled) {
      Swal.fire({
        icon: 'info',
        title: 'Already Installed',
        text: 'BazarNet is already installed on your device. Look for the app icon on your home screen or app list.',
        confirmButtonColor: '#007c89',
        confirmButtonText: 'OK',
      });
      return false;
    }

    const { title, text } = getInstallInstructions();
    Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonColor: '#007c89',
      confirmButtonText: 'OK',
    });
    return false;
  }, [deferredPrompt, isInstalled]);

  const dismiss = useCallback(() => {
    setIsInstallable(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  const dismissed = sessionStorage.getItem('pwa-install-dismissed') === 'true';

  return { isInstallable: isInstallable && !isInstalled && !dismissed, isInstalled, install, dismiss };
}
