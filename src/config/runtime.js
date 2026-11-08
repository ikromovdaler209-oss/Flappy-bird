    window.FLYING_BIRD_RTDB_URL = 'https://flying-bird-d6832-default-rtdb.europe-west1.firebasedatabase.app/';
    window.flyingBirdGetRTDBURL = function () {
      const valid = value => {
        try {
          const u = new URL(String(value || '').trim());
          if (u.protocol !== 'https:' || u.pathname !== '/' || u.search || u.hash || u.username || u.password) return '';
          return /^(flying-bird-d6832)([.-][a-z0-9-]+)*\.(firebasedatabase\.app|firebaseio\.com)$/.test(u.hostname) ? u.origin : '';
        } catch { return ''; }
      };
      const fromInvite = valid(new URLSearchParams(location.search).get('fbDb'));
      const fromProject = valid(window.FLYING_BIRD_RTDB_URL);
      const fromSaved = valid(localStorage.getItem('flyingBirdRTDBUrlV1'));
      // A shared invite can configure a new user's browser without manual input.
      // A deployed project setting wins when present and overrides stale local cache.
      const result = fromProject || fromInvite || fromSaved;
      if (result && result !== fromSaved) {
        try { localStorage.setItem('flyingBirdRTDBUrlV1', result); } catch {}
      }
      return result;
    };
