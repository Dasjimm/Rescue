(function () {
  'use strict';

  const regionData = {
    "Manila": {
      fire: "117",
      police: "117",
      ambulance: "133",
      redcross: "143",
      hospitalMapUrl: "https://www.google.com/maps?q=Manila+City+Hospital"
    },
    "Bulacan": {
      fire: "162",
      police: "161",
      ambulance: "1623",
      redcross: "143",
      hospitalMapUrl: "https://www.google.com/maps?q=Bulacan+Provincial+Hospital"
    },
    "Quezon City": {
      fire: "928-8363",
      police: "434-3681",
      ambulance: "117",
      redcross: "143",
      hospitalMapUrl: "https://www.google.com/maps?q=Quezon+City+General+Hospital"
    }
    
  };

 
  const defaultHotlines = {
    fire: "160",
    police: "166",
    ambulance: "911",
    redcross: "143",
    hospitalMapUrl: "https://www.google.com/maps?q=nearest+hospital"
  };

  function el(id) {
    return document.getElementById(id) || null;
  }

  function cleanTelForHref(raw) {
    if (!raw) return '';
    raw = String(raw).trim();
    if (raw.charAt(0) === '+') {
      return '+' + raw.slice(1).replace(/\D+/g, '');
    } else {
      return raw.replace(/\D+/g, '');
    }
  }


  function setHotlineDOM(data) {
    try {
      const fireElText = el('num-fire');
      const policeElText = el('num-police');
      const ambElText = el('num-ambulance');
      const redElText = el('num-redcross');
      const mapAnchor = el('hotline-map');
      const fireAnchor = el('hotline-fire');
      const policeAnchor = el('hotline-police');
      const ambAnchor = el('hotline-ambulance');
      const redAnchor = el('hotline-redcross');

      if (fireElText) fireElText.innerText = data.fire || defaultHotlines.fire;
      if (policeElText) policeElText.innerText = data.police || defaultHotlines.police;
      if (ambElText) ambElText.innerText = data.ambulance || defaultHotlines.ambulance;
      if (redElText) redElText.innerText = data.redcross || defaultHotlines.redcross;

      if (fireAnchor) fireAnchor.href = `tel:${cleanTelForHref(data.fire || defaultHotlines.fire)}`;
      if (policeAnchor) policeAnchor.href = `tel:${cleanTelForHref(data.police || defaultHotlines.police)}`;
      if (ambAnchor) ambAnchor.href = `tel:${cleanTelForHref(data.ambulance || defaultHotlines.ambulance)}`;
      if (redAnchor) redAnchor.href = `tel:${cleanTelForHref(data.redcross || defaultHotlines.redcross)}`;

      if (mapAnchor) mapAnchor.href = data.hospitalMapUrl || defaultHotlines.hospitalMapUrl;
    } catch (e) {
      console.error('setHotlineDOM error', e);
    }
  }


  function findRegionKey(regionName) {
    if (!regionName) return null;
    const lower = regionName.toLowerCase().trim();

    for (const key of Object.keys(regionData)) {
      const keyLower = key.toLowerCase();
      if (lower === keyLower || lower.includes(keyLower) || keyLower.includes(lower)) {
        return key;
      }
    }

    const tokens = lower.split(/\s+/);
    for (const token of tokens) {
      for (const key of Object.keys(regionData)) {
        if (key.toLowerCase().includes(token)) return key;
      }
    }

    return null;
  }

  function updateHotlines(regionName, coordsFallback) {
    try {
      if (!regionName) {
        console.info('No region name provided, using default hotlines.');
        setHotlineDOM(defaultHotlines);
     
        if (coordsFallback && coordsFallback.lat && coordsFallback.lng) {
          const url = `https://www.google.com/maps/search/?api=1&query=${coordsFallback.lat},${coordsFallback.lng}`;
          setHotlineDOM(Object.assign({}, defaultHotlines, { hospitalMapUrl: url }));
        }
        return;
      }

      const matchedKey = findRegionKey(regionName);
      if (!matchedKey) {
        console.info('No matching regionData for: "' + regionName + '". Using defaults.');
        setHotlineDOM(defaultHotlines);
        return;
      }

      console.info('Matched region:', matchedKey);
      const data = regionData[matchedKey];
      setHotlineDOM(data);
    } catch (e) {
      console.error('updateHotlines error', e);
      setHotlineDOM(defaultHotlines);
    }
  }

  async function reverseGeocode(lat, lng) {
   
    const controller = new AbortController();
    const timeoutMs = 8000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`;

    try {
      const resp = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
      clearTimeout(timeout);

      if (!resp.ok) {
        console.warn('Reverse geocode HTTP not OK:', resp.status);
        return null;
      }

      const json = await resp.json();
      const regionName = json.locality || json.city || json.principalSubdivision || json.countryName || null;
      console.info('Reverse geocode result:', regionName, json);
      return regionName;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        console.warn('Reverse geocode request timed out.');
      } else {
        console.warn('Reverse geocode failed:', err);
      }
      return null;
    }
  }


  function initHotlineByLocation() {
  
    setHotlineDOM(defaultHotlines);

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported in this browser.');
      return;
    }

    const opts = {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60 * 60 * 1000 
    };

    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      console.info('User coords:', lat, lng);

    
      const regionName = await reverseGeocode(lat, lng);
      if (regionName) {
        updateHotlines(regionName);
      } else {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        setHotlineDOM(Object.assign({}, defaultHotlines, { hospitalMapUrl: mapUrl }));
      }
    }, (error) => {
      console.warn('Geolocation error:', error && error.message ? error.message : error);
      setHotlineDOM(defaultHotlines);
    }, opts);
  }

  function showPage(pageId) {
    try {
      const pages = document.querySelectorAll('.page');
      if (!pages || pages.length === 0) {
        console.warn('No elements with .page found in DOM.');
      } else {
        pages.forEach(p => p.classList.remove('active'));
      }

      const target = el(pageId);
      if (!target) {
        console.warn('showPage: element with id "' + pageId + '" not found.');
        return;
      }
      target.classList.add('active');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (e) {
      console.error('showPage error', e);
    }
  }

  function toggleStep(stepId) {
    try {
      const step = el(stepId);
      if (!step) {
        console.warn('toggleStep: element with id "' + stepId + '" not found.');
        return;
      }
      const allSteps = document.querySelectorAll('.step-info');
      allSteps.forEach(s => {
        if (s.id !== stepId) s.style.display = 'none';
      });

      const computed = window.getComputedStyle(step).display;
      if (computed === 'none' || !step.style.display || step.style.display === 'none') {
        step.style.display = 'block';
      } else {
        step.style.display = 'none';
      }
    } catch (e) {
      console.error('toggleStep error', e);
    }
  }

  window.showPage = showPage;
  window.toggleStep = toggleStep;


  window.addEventListener('DOMContentLoaded', () => {
    try {
      setHotlineDOM(defaultHotlines);
      initHotlineByLocation();
    } catch (e) {
      console.error('Initialization error', e);
    }
  });
 const chatbotIcon = document.getElementById('chatbot-icon');
const chatbotPopup = document.getElementById('chatbot-popup');
const chatbotOverlay = document.getElementById('chatbot-overlay');
const closeChatbot = document.getElementById('close-chatbot');


chatbotIcon.addEventListener('click', () => {
  chatbotPopup.style.display = 'block';
  chatbotOverlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
});


closeChatbot.addEventListener('click', () => {
  chatbotPopup.style.display = 'none';
  chatbotOverlay.style.display = 'none';
  document.body.style.overflow = 'auto';
});

})();



