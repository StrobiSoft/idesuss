import assert from 'node:assert/strict';

const elements = new Map();
const topActions = {
  prepend(element) {
    elements.set(element.id, element);
  }
};

globalThis.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelector(selector) {
    return selector === '.top-actions' ? topActions : null;
  },
  createElement(tagName) {
    return {
      tagName: tagName.toUpperCase(),
      hidden: false,
      textContent: '',
      attributes: {},
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    };
  },
  head: {
    appendChild() {
      throw new Error('Supabase library injection was not expected in this test.');
    }
  }
};

let currentUser = { id: 'user-a', email: 'alpha@example.com' };
let authStateCallback = null;
let resolveDelayedProfile;
const delayedProfile = new Promise((resolve) => {
  resolveDelayedProfile = resolve;
});

const profiles = {
  'user-a': { nickname: 'Alpha', avatar_emoji: '🅰️' }
};

const client = {
  auth: {
    async getUser() {
      return { data: { user: currentUser }, error: null };
    },
    onAuthStateChange(callback) {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe() {} } } };
    }
  },
  from(table) {
    assert.equal(table, 'profiles');
    const query = {
      selectedUserId: null,
      select() {
        return this;
      },
      eq(_column, userId) {
        this.selectedUserId = userId;
        return this;
      },
      maybeSingle() {
        if (this.selectedUserId === 'user-b') return delayedProfile;
        return Promise.resolve({ data: profiles[this.selectedUserId] || null, error: null });
      }
    };
    return query;
  },
  channel() {
    return {
      on() {
        return this;
      },
      subscribe() {
        return this;
      }
    };
  },
  removeChannel() {}
};

globalThis.window = { supabaseClient: client };

const { initWebappProfileBridge } = await import('../app/profile-bridge.js');
const cleanup = await initWebappProfileBridge();
const badge = elements.get('webappProfileBadge');

assert.ok(badge, 'Profile badge should be created.');
assert.equal(badge.textContent, '🅰️ Alpha');
assert.equal(typeof authStateCallback, 'function');

currentUser = { id: 'user-b', email: 'bravo@example.com' };
authStateCallback('SIGNED_IN', { user: currentUser });
await Promise.resolve();

currentUser = null;
authStateCallback('SIGNED_OUT', null);
await Promise.resolve();
assert.equal(badge.textContent, '👤 Bejelentkezés');

resolveDelayedProfile({ data: { nickname: 'Bravo', avatar_emoji: '🅱️' }, error: null });
await Promise.resolve();
await Promise.resolve();

assert.equal(
  badge.textContent,
  '👤 Bejelentkezés',
  'A stale profile request must not overwrite the signed-out state.'
);

cleanup();
console.log('Profile bridge runtime ordering OK.');
