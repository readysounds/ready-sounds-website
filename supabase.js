// Shared Supabase client — included on every page that needs Supabase
// Exposes: window.RS.getClient(), window.RS.waitForClient()
(function () {
    var SUPABASE_URL = 'https://pfqvrxfazumlydjepwib.supabase.co';
    var SUPABASE_ANON_KEY = 'sb_publishable_1oBqgAQj0xzb5-eosyfcBg_9dKxNZfa';
    var _client = null;

    // Returns the singleton client. Throws if the SDK isn't loaded yet.
    function getClient() {
        if (!_client) {
            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase SDK not loaded yet — use waitForClient() instead');
            }
            _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        return _client;
    }

    // Returns a Promise that resolves to the client once the SDK is available.
    function waitForClient() {
        return new Promise(function (resolve) {
            function check() {
                if (typeof window.supabase !== 'undefined') {
                    resolve(getClient());
                } else {
                    setTimeout(check, 100);
                }
            }
            check();
        });
    }

    window.RS = window.RS || {};
    window.RS.SUPABASE_URL = SUPABASE_URL;
    window.RS.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
    window.RS.getClient = getClient;
    window.RS.waitForClient = waitForClient;
}());
