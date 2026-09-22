
/* dengageEvents.js */
/* Dengage eComm Demo. Generated file. Sources and notes live in the factory. */
(function (window, document) {
    'use strict';

    function config() { return window.DEMO_CONFIG || {}; }

    function slug() { return window.DEMO_SLUG || config().slug || 'demo'; }

    function compact(payload) {
        var out = {};
        Object.keys(payload || {}).forEach(function (key) {
            var value = payload[key];
            if (value === null || value === undefined || value === '') return;
            if (typeof value === 'number' && !isFinite(value)) return;
            out[key] = value;
        });
        return out;
    }

    function money(value) {
        if (value === null || value === undefined || value === '') return undefined;
        var n = Number(value);
        return isFinite(n) ? n : undefined;
    }

    function count(value) {
        if (value === null || value === undefined || value === '') return undefined;
        var n = Number(value);
        return isFinite(n) ? Math.round(n) : undefined;
    }

    function announceSent(action, body, accepted) {
        var name = 'dps:' + slug() + ':event';
        try {
            window.dispatchEvent(new CustomEvent(name, {
                detail: { action: action, payload: body, accepted: !!accepted, at: Date.now() }
            }));
        } catch (err) {  }
    }

    function send(action, payload) {
        var body = compact(payload);
        if (typeof window.dengage !== 'function') {

            if (window.console) console.log('[dengage dry] ' + action, body);
            announceSent(action, body, false);
            return body;
        }
        try {
            window.dengage(action, body);
            announceSent(action, body, true);
        } catch (err) {
            if (window.console) console.error('[dengage] ' + action + ' failed', err);
            announceSent(action, body, false);
        }
        return body;
    }

    function cartItems(lines) {
        return (lines || []).map(function (line) {
            return compact({
                product_id: String(line.id),
                product_variant_id: line.variantId ? String(line.variantId) : String(line.id),
                quantity: count(line.quantity) || 1,
                unit_price: money(line.price),
                discounted_price: money(line.discountedPrice !== undefined ? line.discountedPrice : line.price)
            });
        });
    }

    var PAGE_TYPES = ['home', 'category', 'product', 'cart', 'checkout',
                      'promotion', 'pricing', 'login', 'logout', 'other'];

    function pageview(pageType, detail) {
        var type = PAGE_TYPES.indexOf(pageType) === -1 ? 'other' : pageType;
        detail = detail || {};
        return send('pageView', {
            page_type: type,
            category_path: detail.categoryPath,
            product_id: detail.productId,
            price: money(detail.price),
            discounted_price: money(detail.discountedPrice),
            stock_count: count(detail.stockCount),
            promotion_id: detail.promotionId
        });
    }

    function addToCart(line, lines) {
        return send('ec:addToCart', {
            product_id: String(line.id),
            product_variant_id: line.variantId ? String(line.variantId) : String(line.id),
            quantity: count(line.quantity) || 1,
            unit_price: money(line.price),
            discounted_price: money(line.discountedPrice !== undefined ? line.discountedPrice : line.price),
            cartItems: cartItems(lines)
        });
    }

    function removeFromCart(line, lines) {
        return send('ec:removeFromCart', {
            product_id: String(line.id),
            product_variant_id: line.variantId ? String(line.variantId) : String(line.id),
            quantity: count(line.quantity) || 1,
            unit_price: money(line.price),
            discounted_price: money(line.discountedPrice !== undefined ? line.discountedPrice : line.price),
            cartItems: cartItems(lines)
        });
    }

    function deleteCart() {
        return send('ec:deleteCart', {});
    }

    function beginCheckout(lines) {
        return send('ec:beginCheckout', { cartItems: cartItems(lines) });
    }

    function order(details, lines) {
        return send('ec:order', {
            order_id: String(details.orderId),
            item_count: count(details.itemCount),
            total_amount: money(details.totalAmount),
            discounted_price: money(details.discountedTotal !== undefined
                ? details.discountedTotal : details.totalAmount),
            payment_method: details.paymentMethod || 'credit_card',
            coupon_code: details.couponCode,
            cartItems: cartItems(lines)
        });
    }

    function search(term, resultCount, filters) {
        return send('ec:search', {
            keywords: String(term || ''),
            result_count: count(resultCount) || 0,
            filters: filters
        });
    }

    var LISTS = ['favorites', 'shopping_list', 'price_drop_alert', 'back_in_stock_alert'];

    var WISHLIST_ADD = 'add';
    var WISHLIST_REMOVE = 'remove';

    function eventId() {
        try {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                return window.crypto.randomUUID();
            }
        } catch (err) {  }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (ch) {
            var n = Math.random() * 16 | 0;
            return (ch === 'x' ? n : (n & 3 | 8)).toString(16);
        });
    }

    function wishlistRow(eventType, fields) {
        var row = compact(fields);
        row.event_id = eventId();
        row.event_type = eventType;
        row.list_name = row.list_name || 'favorites';
        row.is_used = false;
        return row;
    }

    function sendWishlist(action, eventType, fields) {
        var row = wishlistRow(eventType, fields);
        if (typeof window.dengage !== 'function') {
            if (window.console) console.log('[dengage dry] ' + action, row);
            announceSent(action, row, false);
            return row;
        }
        try {
            window.dengage('sendDeviceEvent', 'wishlist_events', row);
            announceSent(action, row, true);
        } catch (err) {
            if (window.console) console.error('[dengage] ' + action + ' failed', err);
            announceSent(action, row, false);
        }
        return row;
    }

    function wishlistList(name) {
        return LISTS.indexOf(name) === -1 ? 'favorites' : name;
    }

    function variantOf(product) {
        return product.variantId ? String(product.variantId) : String(product.id);
    }

    function addToWishlist(product, listName) {
        return sendWishlist('ec:addToWishlist', WISHLIST_ADD, {
            list_name: wishlistList(listName),
            product_id: String(product.id),
            product_variant_id: variantOf(product),
            price: money(product.price),
            discounted_price: money(product.discountedPrice !== undefined
                ? product.discountedPrice : product.price),
            stock_count: count(product.stockCount)
        });
    }

    function removeFromWishlist(product, listName) {
        return sendWishlist('ec:removeFromWishlist', WISHLIST_REMOVE, {
            list_name: wishlistList(listName),
            product_id: String(product.id),
            product_variant_id: variantOf(product)
        });
    }

    function setContactKey(key) {
        if (!key) return false;
        if (typeof window.dengage !== 'function') {
            if (window.console) console.log('[dengage dry] setContactKey ' + key);
            return true;
        }
        try {

            window.dengage('setContactKey', key);
        } catch (err) {
            if (window.console) console.error('[dengage] setContactKey failed', err);
            return false;
        }
        if (window.console) console.log('[dengage] setContactKey ' + key);
        return true;
    }

    var CAPTURES_A_CONTACT = { 'subscription-popup': true };

    function identifyBeforeCapture(slug) {
        if (!CAPTURES_A_CONTACT[slug]) return;

        var identity = window.DemoIdentity;
        if (!identity || identity.contactKey) return;
        if (typeof identity.mintKey !== 'function') return;

        var key = identity.mintKey(Date.now());
        if (!setContactKey(key)) return;
        identity.contactKey = key;

        try {
            window.sessionStorage.setItem(identity.storageKey, key);
        } catch (err) {  }

        pageview('login');
    }

    function scenario(slug) {
        var dengageConfig = config().dengage || {};
        var eventName = (dengageConfig.scenarioPrefix || 'dengage_demo_') + slug;

        identifyBeforeCapture(slug);

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: eventName, actionType: eventName });

        try {
            window.dispatchEvent(new CustomEvent(eventName, { detail: { slug: slug } }));
        } catch (err) {
            try {
                var legacy = document.createEvent('Event');
                legacy.initEvent(eventName, false, false);
                window.dispatchEvent(legacy);
            } catch (ignored) {  }
        }

        if (window.console) console.log('[scenario] ' + eventName + ' (dataLayer and window event)');
        return eventName;
    }

    function pushSupported() {
        if (typeof window.dengage !== 'function') return false;
        try { window.dengage('isPushNotificationsSupported'); return true; }
        catch (err) { return false; }
    }

    function pushStatus() {
        if (typeof window.dengage !== 'function') {
            if (window.console) console.log('[dengage dry] getNotificationPermission');
            return null;
        }
        try { return window.dengage('getNotificationPermission'); }
        catch (err) {
            if (window.console) console.error('[dengage] getNotificationPermission failed', err);
            return null;
        }
    }

    function pushPrompt() {
        if (typeof window.dengage !== 'function') {
            if (window.console) console.log('[dengage dry] showNativePrompt');
            return false;
        }
        try { window.dengage('showNativePrompt'); return true; }
        catch (err) {
            if (window.console) console.error('[dengage] showNativePrompt failed', err);
            return false;
        }
    }

    var INBOX_LIMIT = 20;
    var inbox = null;

    function inboxProvider() {
        if (inbox) return inbox;
        if (typeof window.dengage !== 'function') return null;
        var provider;
        try { provider = window.dengage('InboxMessageProvider', INBOX_LIMIT); }
        catch (err) {
            if (window.console) console.error('[dengage] InboxMessageProvider failed', err);
            return null;
        }
        if (!provider || typeof provider.getMessages !== 'function') return null;
        inbox = provider;
        return inbox;
    }

    function hasApplication() {
        var dengageConfig = config().dengage || {};
        return !!(dengageConfig.appGuid && dengageConfig.appGuid.indexOf('__') !== 0);
    }

    function inboxMessages(limit) {
        if (typeof window.dengage !== 'function' || !hasApplication()) {
            if (window.console) console.log('[dengage dry] InboxMessageProvider.getMessages');
            return Promise.resolve({ status: 'dry', list: [] });
        }
        var provider = inboxProvider();
        if (!provider) return Promise.resolve({ status: 'starting', list: [] });
        var result;
        try { result = provider.getMessages(limit || INBOX_LIMIT); }
        catch (err) { return Promise.resolve({ status: 'starting', list: [] }); }
        if (!result || typeof result.then !== 'function') {
            return Promise.resolve({ status: 'starting', list: [] });
        }
        return result.then(function (list) {
            return { status: 'ok', list: Array.isArray(list) ? list : [] };
        }, function (reason) {

            if (reason === undefined || reason === null) {
                return { status: 'starting', list: [] };
            }
            if (window.console) console.warn('[dengage] inbox getMessages', reason);
            return { status: 'error', list: [], reason: String(reason) };
        });
    }

    function inboxReport(method, id, buttonId) {
        var provider = inboxProvider();
        if (!provider || typeof provider[method] !== 'function') {
            if (window.console) console.log('[dengage dry] inbox ' + method + ' ' + id);
            return false;
        }
        try {
            if (buttonId === undefined) provider[method](id);
            else provider[method](id, buttonId);
        } catch (err) {
            if (window.console) console.error('[dengage] inbox ' + method + ' failed', err);
            return false;
        }
        return true;
    }

    function inboxImpression(id) { return inboxReport('onImpression', id); }
    function inboxOpen(id) { return inboxReport('onOpen', id); }
    function inboxClick(id, buttonId) { return inboxReport('onClick', id, buttonId || 'cta'); }

    function inboxDelete(id) {
        var dengageConfig = config().dengage || {};
        if (!dengageConfig.inboxReportDelete) {
            if (window.console) {
                console.log('[dengage] inbox dismiss is local only. Set ' +
                    'dengage.inboxReportDelete to report it to Dengage.');
            }
            return false;
        }
        return inboxReport('onDelete', id);
    }

    var SDK_SESSION_KEY = '_dn_sessions';

    function sdkSessionId() {
        try {
            var raw = window.localStorage.getItem(SDK_SESSION_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            return (parsed && parsed.sessionId) ? String(parsed.sessionId) : null;
        } catch (err) {
            return null;
        }
    }

    function reference(done) {
        var dengageConfig = config().dengage || {};
        var out = {
            contactKey: (window.DemoIdentity && window.DemoIdentity.contactKey) || null,
            sessionId: sdkSessionId(),
            deviceId: null,
            pushToken: null,
            appGuid: dengageConfig.appGuid || null,
            accountId: dengageConfig.accountId || null,
            slug: slug(),

            demoUrl: (function () {
                try {
                    return window.location.origin + window.location.pathname;
                } catch (err) {
                    return null;
                }
            }())
        };

        if (typeof window.dengage !== 'function') {
            done(out);
            return;
        }

        var settled = false;
        var pending = 2;
        function finish() {
            if (settled) return;
            settled = true;
            done(out);
        }
        function one() { pending -= 1; if (pending <= 0) finish(); }

        window.setTimeout(finish, 1200);

        try {
            window.dengage('getDeviceId', function (id) {
                if (id) out.deviceId = String(id);
                one();
            });
        } catch (err) { one(); }

        try {
            window.dengage('getToken', function (token) {
                if (token) out.pushToken = String(token);
                one();
            });
        } catch (err) { one(); }
    }

    window.DengageEvents = {
        pageview: pageview,
        reference: reference,
        addToCart: addToCart,
        removeFromCart: removeFromCart,
        deleteCart: deleteCart,
        beginCheckout: beginCheckout,
        order: order,
        search: search,
        addToWishlist: addToWishlist,
        removeFromWishlist: removeFromWishlist,
        setContactKey: setContactKey,
        scenario: scenario,
        pushSupported: pushSupported,
        pushStatus: pushStatus,
        pushPrompt: pushPrompt,
        inboxMessages: inboxMessages,
        inboxImpression: inboxImpression,
        inboxOpen: inboxOpen,
        inboxClick: inboxClick,
        inboxDelete: inboxDelete,

        compact: compact,
        money: money,
        count: count,
        slug: slug
    };
})(window, document);

;

/* artwork.js */
/* Dengage eComm Demo. Generated file. Sources and notes live in the factory. */
(function (window) {
    'use strict';

    var W = 400, H = 300;

    var FILLABLE = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline'];

    var MOTIFS = [

        { id: 'jacket', words: ['jacket', 'coat', 'parka', 'blazer', 'anorak', 'gilet', 'outerwear'],
          art: '<path d="M168 92l22-14q10 12 20 0l22 14 22 22-16 12-4 96h-68l-4-96-16-12z"/>' +
               '<path d="M190 78l10 30 10-30" class="ln"/>' +
               '<path d="M200 108v114" class="ln"/>' },

        { id: 'knit', words: ['knit', 'sweater', 'jumper', 'cardigan', 'hoodie', 'sweatshirt', 'pullover', 'fleece'],
          art: '<path d="M170 94h60l24 20-14 14-6-8v102h-68V120l-6 8-14-14z"/>' +
               '<path d="M176 214h48" class="ln"/><path d="M176 204h48" class="ln"/>' +
               '<path d="M182 94q18 14 36 0" class="ln"/>' },

        { id: 'shirt', words: ['shirt', 'blouse', 'tee', 't-shirt', 'polo', 'top', 'vest', 'tunic'],
          art: '<path d="M172 92l20-12q8 12 16 0l20 12 24 20-14 14-6-6v96h-64v-96l-6 6-14-14z"/>' +
               '<path d="M192 80l8 18 8-18" class="ln"/>' },

        { id: 'trousers', words: ['trouser', 'pant', 'jean', 'chino', 'short', 'legging', 'jogger'],
          art: '<path d="M172 82h56v26l-6 114h-20l-2-92-2 92h-20l-6-114z"/>' +
               '<path d="M172 100h56" class="ln"/>' },

        { id: 'dress', words: ['dress', 'gown', 'skirt', 'frock'],
          art: '<path d="M180 84h40l6 34 26 104h-104l26-104z"/>' +
               '<path d="M180 118h40" class="ln"/>' },

        { id: 'boot', words: ['boot', 'chelsea', 'chukka'],
          art: '<path d="M160 96h44v70l52 18q10 4 10 14v14H160z"/>' +
               '<path d="M160 190h106" class="ln"/><path d="M204 130h-44" class="ln"/>' },

        { id: 'shoe', words: ['shoe', 'sneaker', 'trainer', 'loafer', 'sandal', 'heel', 'pump', 'brogue', 'footwear'],
          art: '<path d="M128 196v-24q0-12 14-14l40-6 22-24q8-8 16 0l12 22q28 10 38 22 8 10 8 24z"/>' +
               '<path d="M128 196h150v14H128z"/>' +
               '<path d="M180 152l14 16" class="ln"/><path d="M198 158l14 16" class="ln"/>' },

        { id: 'bag', words: ['bag', 'tote', 'backpack', 'purse', 'wallet', 'weekender', 'holdall', 'luggage', 'satchel'],
          art: '<path d="M146 122h108l10 104H136z"/>' +
               '<path d="M174 122v-14q0-26 26-26t26 26v14" class="ln"/>' },

        { id: 'smartwatch', words: ['smartwatch', 'fitness watch', 'fitness tracker', 'wearable', 'tracker'],
          art: '<rect x="168" y="112" width="64" height="76" rx="16"/>' +
               '<path d="M182 112V84h36v28" class="ln"/><path d="M182 188v28h36v-28" class="ln"/>' +
               '<path d="M182 138h36" class="ln"/><path d="M182 158h24" class="ln"/>' },

        { id: 'watch', words: ['watch', 'timepiece', 'chronograph'],
          art: '<circle cx="200" cy="150" r="42"/>' +
               '<path d="M182 108V82h36v26" class="ln"/><path d="M182 192v26h36v-26" class="ln"/>' +
               '<path d="M200 128v22h18" class="ln2"/>' },

        { id: 'glasses', words: ['sunglass', 'glasses', 'eyewear', 'frame', 'spectacle'],
          art: '<rect x="132" y="128" width="56" height="44" rx="14"/>' +
               '<rect x="212" y="128" width="56" height="44" rx="14"/>' +
               '<path d="M188 148h24" class="ln"/><path d="M132 142l-16-10" class="ln"/>' +
               '<path d="M268 142l16-10" class="ln"/>' },

        { id: 'hat', words: ['hat', 'cap', 'beanie', 'fedora', 'bucket'],
          art: '<path d="M156 168q0-52 44-52t44 52z"/>' +
               '<path d="M126 168h148q6 0 6 8t-6 8H126q-6 0-6-8t6-8z"/>' },

        { id: 'scarf', words: ['scarf', 'throw', 'blanket', 'shawl', 'wrap'],
          art: '<path d="M158 92h32l-4 100h-28z"/><path d="M210 92h32l-4 100h-28z"/>' +
               '<path d="M158 92q42-26 84 0" class="ln3"/>' +
               '<path d="M158 192v16M168 192v16M178 192v16M188 192v16" class="ln"/>' +
               '<path d="M212 192v16M222 192v16M232 192v16M242 192v16" class="ln"/>' },

        { id: 'rug', words: ['rug', 'mat', 'carpet', 'runner'],
          art: '<rect x="128" y="102" width="144" height="96" rx="4"/>' +
               '<rect x="146" y="120" width="108" height="60" rx="2" class="ln"/>' +
               '<path d="M128 198v14M164 198v14M200 198v14M236 198v14M272 198v14" class="ln"/>' },

        { id: 'laptop', words: ['laptop', 'macbook', 'ultrabook', 'chromebook', 'notebook computer'],
          art: '<path d="M158 100h84q8 0 8 8v66h-100v-66q0-8 8-8z"/>' +
               '<path d="M130 182h140l14 22H116z"/>' +
               '<path d="M170 112h60v50h-60z" class="ln"/>' },

        { id: 'tablet', words: ['tablet', 'ipad', 'e-reader', 'ereader'],
          art: '<rect x="152" y="82" width="96" height="136" rx="10"/>' +
               '<rect x="164" y="96" width="72" height="100" rx="2" class="ln"/>' +
               '<circle cx="200" cy="206" r="5" class="ln"/>' },

        { id: 'phone', words: ['phone', 'mobile', 'smartphone', 'handset'],
          art: '<rect x="164" y="76" width="72" height="148" rx="12"/>' +
               '<rect x="174" y="92" width="52" height="112" rx="2" class="ln"/>' +
               '<path d="M190 84h20" class="ln"/>' },

        { id: 'headphones', words: ['headphone', 'earbud', 'earphone', 'headset', 'over ear', 'on ear'],
          art: '<path d="M144 168v-18a56 56 0 01112 0v18" class="ln3"/>' +
               '<rect x="126" y="152" width="36" height="60" rx="14"/>' +
               '<rect x="238" y="152" width="36" height="60" rx="14"/>' },

        { id: 'speaker', words: ['speaker', 'soundbar', 'subwoofer', 'boombox'],
          art: '<rect x="158" y="80" width="84" height="140" rx="14"/>' +
               '<circle cx="200" cy="126" r="22" class="ln"/><circle cx="200" cy="126" r="8" class="ln"/>' +
               '<circle cx="200" cy="184" r="14" class="ln"/>' },

        { id: 'camera', words: ['camera', 'mirrorless', 'dslr', 'lens', 'camcorder'],
          art: '<path d="M136 116h28l10-14h52l10 14h28q10 0 10 10v78q0 10-10 10H136q-10 0-10-10v-78q0-10 10-10z"/>' +
               '<circle cx="200" cy="165" r="34" class="ln"/><circle cx="200" cy="165" r="16" class="ln"/>' },

        { id: 'tv', words: ['tv', 'television', 'monitor', 'display', 'screen'],
          art: '<rect x="120" y="86" width="160" height="104" rx="8"/>' +
               '<rect x="134" y="100" width="132" height="76" rx="2" class="ln"/>' +
               '<path d="M200 190v22" class="ln"/><path d="M166 214h68" class="ln3"/>' },

        { id: 'console', words: ['console', 'gamepad', 'controller', 'joystick'],
          art: '<path d="M148 122h104q26 0 26 34t-18 34h-16l-14-18h-60l-14 18h-16q-18 0-18-34t26-34z"/>' +
               '<circle cx="174" cy="152" r="9" class="ln"/><circle cx="226" cy="152" r="9" class="ln"/>' },

        { id: 'chair', words: ['chair', 'stool', 'seat', 'bench'],
          art: '<path d="M158 84h12v92h-12z"/><path d="M230 84h12v92h-12z"/>' +
               '<path d="M150 100h100v12h-100z" class="ln"/><path d="M150 128h100v12h-100z" class="ln"/>' +
               '<path d="M140 168h120v14H140z"/>' +
               '<path d="M150 182v42M250 182v42" class="ln3"/>' },

        { id: 'sofa', words: ['sofa', 'couch', 'settee', 'loveseat'],
          art: '<path d="M132 132q0-14 14-14h108q14 0 14 14v30H132z"/>' +
               '<path d="M120 158h160q10 0 10 12v34H110v-34q0-12 10-12z"/>' +
               '<path d="M126 204v18M274 204v18" class="ln3"/>' },

        { id: 'table', words: ['table', 'desk', 'dining', 'console table', 'sideboard'],
          art: '<path d="M116 122h168v16H116z"/>' +
               '<path d="M136 138v82M264 138v82" class="ln3"/>' +
               '<path d="M136 176h128" class="ln"/>' },

        { id: 'lamp', words: ['lamp', 'lighting', 'lantern', 'pendant', 'sconce'],
          art: '<path d="M164 76h72l20 62H144z"/>' +
               '<path d="M200 138v66" class="ln3"/>' +
               '<path d="M164 204h72q6 0 6 8t-6 8h-72q-6 0-6-8t6-8z"/>' },

        { id: 'cookware', words: ['casserole', 'pan', 'pot', 'skillet', 'saucepan', 'cast iron', 'dutch oven', 'cookware'],
          art: '<path d="M142 128h116v46q0 32-32 32h-52q-32 0-32-32z"/>' +
               '<path d="M132 128h136" class="ln3"/>' +
               '<path d="M186 116h28v12h-28z"/><path d="M194 104h12v12h-12z" class="ln"/>' },

        { id: 'mug', words: ['mug', 'cup', 'tumbler', 'glassware', 'flask'],
          art: '<path d="M150 108h84v70q0 26-26 26h-32q-26 0-26-26z"/>' +
               '<path d="M234 128h18q14 0 14 16v10q0 16-14 16h-18" class="ln3"/>' },

        { id: 'plate', words: ['plate', 'bowl', 'dish', 'platter', 'dinnerware'],
          art: '<circle cx="200" cy="150" r="66"/>' +
               '<circle cx="200" cy="150" r="42" class="ln"/>' },

        { id: 'bottle', words: ['serum', 'perfume', 'fragrance', 'eau de', 'oil', 'bottle', 'shampoo', 'conditioner'],
          art: '<path d="M186 74h28v22l14 20v96q0 12-12 12h-32q-12 0-12-12v-96l14-20z"/>' +
               '<path d="M180 140h40" class="ln"/><path d="M180 158h40" class="ln"/>' },

        { id: 'jar', words: ['cream', 'balm', 'jar', 'mask', 'pomade', 'butter'],
          art: '<path d="M158 116h84v72q0 14-14 14h-56q-14 0-14-14z"/>' +
               '<path d="M150 96h100v20H150z"/>' },

        { id: 'tube', words: ['lotion', 'gel', 'cleanser', 'toothpaste', 'tube', 'sunscreen', 'moisturiser', 'moisturizer'],
          art: '<path d="M172 108h56v88q0 12-12 12h-32q-12 0-12-12z"/>' +
               '<path d="M172 108l10-18h36l10 18" class="ln3"/>' +
               '<rect x="190" y="74" width="20" height="18" rx="3"/>' },

        { id: 'ball', words: ['ball', 'football', 'basketball', 'volleyball', 'tennis'],
          art: '<circle cx="200" cy="150" r="64"/>' +
               '<path d="M144 120q56 22 112 0M144 180q56-22 112 0" class="ln"/>' +
               '<path d="M200 86v128" class="ln"/>' },

        { id: 'dumbbell', words: ['dumbbell', 'kettlebell', 'weight plate', 'barbell'],
          art: '<rect x="150" y="122" width="24" height="56" rx="6"/>' +
               '<rect x="226" y="122" width="24" height="56" rx="6"/>' +
               '<rect x="130" y="134" width="16" height="32" rx="5"/>' +
               '<rect x="254" y="134" width="16" height="32" rx="5"/>' +
               '<path d="M174 142h52v16h-52z"/>' },

        { id: 'bike', words: ['bike', 'bicycle', 'cycle', 'scooter'],
          art: '<circle cx="150" cy="182" r="34" class="ln3"/><circle cx="250" cy="182" r="34" class="ln3"/>' +
               '<path d="M150 182l34-58h40l26 58M184 124h52" class="ln3"/>' },

        { id: 'book', words: ['book', 'novel', 'guide', 'journal', 'notebook', 'diary', 'cookbook'],
          art: '<path d="M132 92h60q8 0 8 8v112h-68z"/>' +
               '<path d="M268 92h-60q-8 0-8 8v112h68z"/>' +
               '<path d="M200 100v112" class="ln"/>' +
               '<path d="M146 122h38M146 142h38M216 122h38M216 142h38" class="ln"/>' },

        { id: 'toy', words: ['toy', 'plush', 'teddy', 'blocks', 'puzzle', 'figurine'],
          art: '<circle cx="200" cy="120" r="34"/>' +
               '<circle cx="166" cy="94" r="14"/><circle cx="234" cy="94" r="14"/>' +
               '<path d="M164 160h72q10 0 10 12v34q0 12-12 12h-68q-12 0-12-12v-34q0-12 10-12z"/>' },

        { id: 'tool', words: ['tool', 'wrench', 'drill', 'screwdriver', 'hammer', 'spanner'],
          art: '<path d="M148 96a26 26 0 0136 24l72 72-18 18-72-72a26 26 0 01-18-42z"/>' +
               '<circle cx="164" cy="112" r="9" class="ln"/>' },

        { id: 'tyre', words: ['tyre', 'tire', 'all season', 'all-season'],

          art: '<path fill-rule="evenodd" d="M200 150m-76 0a76 76 0 1 0 152 0a76 76 0 1 0-152 0' +
               'M200 150m-44 0a44 44 0 1 0 88 0a44 44 0 1 0-88 0z"/>' +
               '<path d="M200 66v18M200 216v18M116 150h18M266 150h18' +
               'M141 91l13 13M246 196l13 13M259 91l-13 13M154 196l-13 13" class="ln2"/>' +
               '<circle cx="200" cy="150" r="30" class="ln"/>' },

        { id: 'wheel', words: ['rim', 'wheel', 'alloy', 'hubcap', 'hub cap', 'wheel trim'],
          art: '<path fill-rule="evenodd" d="M200 150m-72 0a72 72 0 1 0 144 0a72 72 0 1 0-144 0' +
               'M200 150m-58 0a58 58 0 1 0 116 0a58 58 0 1 0-116 0z"/>' +
               '<circle cx="200" cy="150" r="14"/>' +
               '<path d="M200 136V96M200 164v40M186 143l-38-22M214 157l38 22M214 143l38-22' +
               'M186 157l-38 22" class="ln2"/>' },

        { id: 'brake', words: ['brake', 'brake disc', 'brake pad', 'disc', 'rotor', 'caliper'],
          art: '<path fill-rule="evenodd" d="M200 150m-70 0a70 70 0 1 0 140 0a70 70 0 1 0-140 0' +
               'M200 150m-24 0a24 24 0 1 0 48 0a24 24 0 1 0-48 0z"/>' +
               '<path d="M256 108h16q10 0 10 10v64q0 10-10 10h-16z" class="ln2"/>' +
               '<circle cx="200" cy="104" r="6" class="ln"/><circle cx="236" cy="128" r="6" class="ln"/>' +
               '<circle cx="236" cy="172" r="6" class="ln"/><circle cx="200" cy="196" r="6" class="ln"/>' +
               '<circle cx="164" cy="172" r="6" class="ln"/><circle cx="164" cy="128" r="6" class="ln"/>' },

        { id: 'battery', words: ['battery', 'accumulator', 'jump starter'],
          art: '<rect x="134" y="104" width="132" height="96" rx="8"/>' +
               '<rect x="152" y="88" width="26" height="16" rx="4"/>' +
               '<rect x="222" y="88" width="26" height="16" rx="4"/>' +
               '<path d="M156 140h24M168 128v24" class="ln2"/>' +
               '<path d="M220 140h24" class="ln2"/>' +
               '<path d="M134 172h132" class="ln"/>' },

        { id: 'fluid', words: ['fluid', 'engine oil', 'motor oil', 'gear oil',
                               'transmission fluid', 'brake fluid', 'coolant', 'antifreeze',
                               'lubricant', 'grease', 'screenwash', 'adblue', 'ad blue',
                               'additive'],
          art: '<path d="M162 110h76q10 0 10 10v90q0 10-10 10h-76q-10 0-10-10v-90q0-10 10-10z"/>' +
               '<path d="M186 110V92h28v18" class="ln2"/>' +
               '<rect x="182" y="78" width="36" height="16" rx="4"/>' +
               '<path d="M248 130h14q8 0 8 8v26q0 8-8 8h-14" class="ln2"/>' +
               '<path d="M162 146h76M162 166h76" class="ln"/>' },

        { id: 'filter', words: ['filter', 'oil filter', 'air filter', 'cabin filter', 'fuel filter'],
          art: '<path d="M158 96h84q8 0 8 8v92q0 8-8 8h-84q-8 0-8-8v-92q0-8 8-8z"/>' +
               '<path d="M170 96v108M186 96v108M202 96v108M218 96v108M234 96v108" class="ln2"/>' +
               '<ellipse cx="200" cy="96" rx="50" ry="12"/>' +
               '<path d="M150 204h100" class="ln"/>' },

        { id: 'sparkplug', words: ['spark plug', 'sparkplug', 'glow plug', 'ignition coil', 'plug'],
          art: '<path d="M188 74h24v34h-24z"/>' +
               '<path d="M180 108h40l-6 26h-28z"/>' +
               '<path d="M184 134h32v20h-32z"/>' +
               '<path d="M190 154h20v42h-20z"/>' +
               '<path d="M196 196h8v30h-8z"/>' +
               '<path d="M184 140h32M184 148h32M190 162h20M190 172h20M190 182h20" class="ln"/>' },

        { id: 'wiper', words: ['wiper', 'wiper blade', 'windscreen', 'windshield'],
          art: '<path d="M132 206l124-88 10 14-124 88z"/>' +
               '<path d="M256 118l14-10 10 14-14 10z"/>' +
               '<path d="M140 196l112-80" class="ln"/>' +
               '<path d="M124 214h44" class="ln2"/>' },

        { id: 'headlight', words: ['headlight', 'headlamp', 'taillight', 'fog light', 'bulb',
                                   'indicator', 'light bulb'],
          art: '<path d="M146 106h58q40 0 40 44t-40 44h-58q-10 0-10-10v-68q0-10 10-10z"/>' +
               '<circle cx="188" cy="150" r="26" class="ln2"/>' +
               '<path d="M258 122l26-14M258 150h30M258 178l26 14" class="ln2"/>' },

        { id: 'car', words: ['car', 'vehicle', 'sedan', 'hatchback', 'suv', 'estate car', 'van'],
          art: '<path d="M128 178q0-16 12-20l16-32q6-12 20-12h48q14 0 20 12l16 32q12 4 12 20v14h-144z"/>' +
               '<path d="M164 122h72l12 24h-96z" class="ln"/>' +
               '<circle cx="162" cy="196" r="18"/><circle cx="238" cy="196" r="18"/>' +
               '<circle cx="162" cy="196" r="7" class="ln"/><circle cx="238" cy="196" r="7" class="ln"/>' }
    ];

    function hash(text) {
        var h = 2166136261, i;
        text = String(text || '');
        for (i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = (h * 16777619) >>> 0;
        }
        return h;
    }

    function norm(text) {
        return ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9-]+/g, ' ') + ' ';
    }

    var PATTERNS = MOTIFS.map(function (m) {
        return {
            motif: m,
            res: m.words.map(function (w) {

                return new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
                                  '(?:e?s)?($|[^a-z0-9])', 'g');
            })
        };
    });

    function context(product) {
        var parts = [product.category, product.categoryPath];
        var attrs = product.attributes || {};
        Object.keys(attrs).forEach(function (k) { parts.push(k); parts.push(attrs[k]); });
        return norm(parts.join(' '));
    }

    function furthest(res, text) {
        var i, m, start, end, len, best = null;
        for (i = 0; i < res.length; i++) {
            res[i].lastIndex = 0;
            while ((m = res[i].exec(text)) !== null) {
                start = m.index + m[1].length;
                len = m[0].length - m[1].length - m[2].length;
                end = start + len;
                if (!best || end > best.end || (end === best.end && len > best.len)) {
                    best = { end: end, len: len };
                }

                if (res[i].lastIndex > m.index) res[i].lastIndex = m.index + 1;
            }
        }
        return best;
    }

    function classify(product) {
        var name = norm(product.name), i, m;
        var best = null, bestAt = null;

        for (i = 0; i < PATTERNS.length; i++) {
            m = furthest(PATTERNS[i].res, name);
            if (!m) continue;
            if (!bestAt || m.end > bestAt.end || (m.end === bestAt.end && m.len > bestAt.len)) {
                bestAt = m;
                best = PATTERNS[i].motif;
            }
        }
        if (best) return best;

        var rest = context(product);
        for (i = 0; i < PATTERNS.length; i++) {
            if (furthest(PATTERNS[i].res, rest)) return PATTERNS[i].motif;
        }
        return null;
    }

    function escapeText(text) {
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function escapeAttr(text) {
        return escapeText(text).replace(/"/g, '&quot;');
    }

    function initials(product, seed, gid) {
        var letters = (product.name || '?').split(/\s+/).slice(0, 2)
            .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
        return '<text x="200" y="150" text-anchor="middle" dominant-baseline="central" ' +
            'font-family="system-ui, sans-serif" font-size="64" font-weight="700" ' +
            'fill="currentColor" fill-opacity=".28">' + escapeText(letters) + '</text>';
    }

    function svg(product) {
        var seed = hash(product.id);
        var gid = 'a' + seed.toString(36);
        var motif = classify(product);

        var rotate = seed % 60 - 30;

        var body = motif
            ? '<g class="mf">' + motif.art + '</g>'
            : initials(product, seed, gid);

        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" ' +
            'role="img" aria-label="' + escapeAttr(product.name) + '" ' +
            'data-motif="' + escapeAttr(motif ? motif.id : 'initials') + '">' +
            '<defs>' +
              '<linearGradient id="' + gid + '" gradientTransform="rotate(' + rotate + ' .5 .5)">' +
                '<stop offset="0" stop-color="currentColor" stop-opacity=".16"/>' +
                '<stop offset="1" stop-color="currentColor" stop-opacity=".05"/>' +
              '</linearGradient>' +

              '<style>' +

                FILLABLE.map(function (tag) {
                    return '#' + gid + '-g .mf ' + tag;
                }).join(',') + '{fill:currentColor;fill-opacity:.26;stroke:none}' +
                '#' + gid + '-g .mf .ln{fill:none;stroke:currentColor;stroke-opacity:.34;stroke-width:4}' +
                '#' + gid + '-g .mf .ln2{fill:none;stroke:currentColor;stroke-opacity:.5;stroke-width:5}' +
                '#' + gid + '-g .mf .ln3{fill:none;stroke:currentColor;stroke-opacity:.3;stroke-width:7;' +
                  'stroke-linecap:round}' +
              '</style>' +
            '</defs>' +
            '<rect width="' + W + '" height="' + H + '" fill="url(#' + gid + ')"/>' +
            '<g id="' + gid + '-g">' + body + '</g>' +
            '</svg>';
    }

    window.Artwork = {

        svg: svg,

        classify: function (product) {
            var m = classify(product);
            return m ? m.id : null;
        },
        motifs: function () {
            return MOTIFS.map(function (m) { return m.id; });
        },

        art: function () {
            return MOTIFS.map(function (m) { return { id: m.id, art: m.art, words: m.words }; });
        },
        fillable: function () { return FILLABLE.slice(); }
    };
})(window);

;

/* catalog.js */
/* Dengage eComm Demo. Generated file. Sources and notes live in the factory. */
(function (window) {
    'use strict';

    function num(value) {
        if (value === null || value === undefined || value === '') return null;
        var n = Number(value);
        return isFinite(n) ? n : null;
    }

    function normalise(raw) {
        if (!raw || !raw.id) return null;

        var price = num(raw.price);
        var discounted = num(raw.discountedPrice);
        var stock = num(raw.stockCount);

        return {
            id: String(raw.id),
            name: raw.name || String(raw.id),
            category: raw.category || '',
            categoryPath: raw.categoryPath || raw.category || '',

            price: price,

            discountedPrice: (discounted !== null && price !== null && discounted < price) ? discounted : null,

            stockCount: stock,
            attributes: raw.attributes || {},
            image: raw.image || null,
            url: 'product.html?id=' + encodeURIComponent(String(raw.id))
        };
    }

    function effectivePrice(product) {
        if (product.discountedPrice !== null) return product.discountedPrice;
        return product.price;
    }

    function hash(text) {
        var h = 0, i;
        for (i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
        return Math.abs(h);
    }

    function placeholder(product) {
        var seed = hash(product.id);
        var gid = 'g' + seed.toString(36);
        var rotate = seed % 60 - 30;
        var initials = (product.name || '?').split(/\s+/).slice(0, 2)
            .map(function (w) { return w.charAt(0); }).join('').toUpperCase();

        var svg =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" ' +
            'aria-label="' + escapeAttr(product.name) + '">' +
            '<defs><linearGradient id="' + gid + '" gradientTransform="rotate(' + rotate + ' .5 .5)">' +
            '<stop offset="0" stop-color="currentColor" stop-opacity=".16"/>' +
            '<stop offset="1" stop-color="currentColor" stop-opacity=".05"/>' +
            '</linearGradient></defs>' +
            '<rect width="400" height="300" fill="url(#' + gid + ')"/>' +
            '<text x="200" y="150" text-anchor="middle" dominant-baseline="central" ' +
            'font-family="system-ui, sans-serif" font-size="64" font-weight="700" ' +
            'fill="currentColor" fill-opacity=".28">' + escapeText(initials) + '</text>' +
            '</svg>';
        return svg;
    }

    function escapeText(text) {
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function escapeAttr(text) {
        return escapeText(text).replace(/"/g, '&quot;');
    }

    function media(product) {
        if (product.image) {
            return '<img src="' + escapeAttr(product.image) + '" alt="' +
                   escapeAttr(product.name) + '" loading="lazy">';
        }

        if (window.Artwork) {
            return '<span class="art" aria-hidden="false">' + window.Artwork.svg(product) + '</span>';
        }
        return '<span class="art" aria-hidden="false">' + placeholder(product) + '</span>';
    }

    var products = [];
    var byId = {};
    var categories = [];

    function load(url) {
        return fetch(url, { cache: 'no-store' })
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function (data) {
                products = (data.products || []).map(normalise).filter(Boolean);
                byId = {};
                products.forEach(function (p) { byId[p.id] = p; });

                categories = [];
                products.forEach(function (p) {
                    if (p.category && categories.indexOf(p.category) === -1) categories.push(p.category);
                });
                return products;
            });
    }

    window.Catalog = {
        load: load,
        all: function () { return products; },
        get: function (id) { return byId[id] || null; },
        categories: function () { return categories.slice(); },
        inCategory: function (category) {
            if (!category) return products.slice();
            return products.filter(function (p) { return p.category === category; });
        },

        similar: function (product, limit) {
            return products
                .filter(function (p) { return p.id !== product.id && p.category === product.category; })
                .slice(0, limit || 6);
        },
        alsoViewed: function (product, limit) {
            var seed = hash(product.id);
            return products
                .filter(function (p) { return p.id !== product.id; })
                .sort(function (a, b) { return ((hash(a.id) + seed) % 97) - ((hash(b.id) + seed) % 97); })
                .slice(0, limit || 6);
        },
        search: function (term) {
            var q = String(term || '').trim().toLowerCase();
            if (!q) return [];
            return products.filter(function (p) {
                return p.name.toLowerCase().indexOf(q) !== -1 ||
                       p.categoryPath.toLowerCase().indexOf(q) !== -1 ||
                       p.id.toLowerCase().indexOf(q) !== -1;
            });
        },
        effectivePrice: effectivePrice,
        media: media,
        placeholder: placeholder,
        escapeAttr: escapeAttr,
        escapeText: escapeText
    };
})(window);

;

/* store.js */
/* Dengage eComm Demo. Generated file. Sources and notes live in the factory. */
(function (window) {
    'use strict';

    var slug = window.DEMO_SLUG || 'demo';
    var CART_KEY = 'dps:' + slug + ':cart';
    var WISH_KEY = 'dps:' + slug + ':wishlist';

    var listeners = [];

    function read(key) {
        try {
            var raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (err) { return []; }
    }
    function write(key, value) {
        try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (err) {  }
    }

    var cart = read(CART_KEY);
    var wishlist = read(WISH_KEY);

    function announce() {
        listeners.forEach(function (fn) {
            try { fn(); } catch (err) { if (window.console) console.error(err); }
        });
    }

    function line(product, quantity) {
        return {
            id: product.id,
            name: product.name,
            quantity: quantity,
            price: product.price,
            discountedPrice: product.discountedPrice,
            categoryPath: product.categoryPath,
            image: product.image || null
        };
    }

    function addToCart(product, quantity) {
        quantity = quantity || 1;
        var existing = cart.filter(function (l) { return l.id === product.id; })[0];
        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push(line(product, quantity));
        }
        write(CART_KEY, cart);

        window.DengageEvents.addToCart(line(product, quantity), cart);
        announce();
    }

    function removeFromCart(id) {
        var removed = cart.filter(function (l) { return l.id === id; })[0];
        cart = cart.filter(function (l) { return l.id !== id; });
        write(CART_KEY, cart);
        if (removed) window.DengageEvents.removeFromCart(removed, cart);
        announce();
    }

    function clearCart(silent) {
        cart = [];
        write(CART_KEY, cart);
        if (!silent) window.DengageEvents.deleteCart();
        announce();
    }

    function cartTotal() {
        var total = 0, i, price;
        for (i = 0; i < cart.length; i++) {
            price = cart[i].discountedPrice !== null && cart[i].discountedPrice !== undefined
                ? cart[i].discountedPrice : cart[i].price;
            if (price === null || price === undefined) return null;
            total += price * cart[i].quantity;
        }
        return total;
    }

    function cartCount() {
        return cart.reduce(function (n, l) { return n + l.quantity; }, 0);
    }

    function beginCheckout() {
        if (!cart.length) return;
        window.DengageEvents.beginCheckout(cart);
    }

    function placeOrder(paymentMethod) {
        if (!cart.length) return null;
        var orderId = 'DPS-' + slug + '-' + Date.now();
        var total = cartTotal();
        window.DengageEvents.order({
            orderId: orderId,
            itemCount: cartCount(),
            totalAmount: total,
            paymentMethod: paymentMethod || 'credit_card'
        }, cart);
        clearCart(true);
        return { orderId: orderId, total: total };
    }

    function hasDiscount(product) {
        return product.discountedPrice !== null &&
               product.discountedPrice !== undefined &&
               product.discountedPrice !== '' &&
               Number(product.discountedPrice) < Number(product.price);
    }

    function semanticListsEnabled() {
        var config = window.DEMO_CONFIG || {};
        var dengageConfig = config.dengage || {};
        return dengageConfig.wishlistLists === true;
    }

    function listFor(product) {
        if (!semanticListsEnabled()) return 'favorites';
        if (product.stockCount === 0) return 'back_in_stock_alert';
        if (hasDiscount(product)) return 'price_drop_alert';
        return 'favorites';
    }

    function isSaved(id) {
        return wishlist.some(function (w) { return w.id === id; });
    }

    function removeFromWishlist(id) {
        var saved = wishlist.filter(function (w) { return w.id === id; })[0];
        if (!saved) return;
        wishlist = wishlist.filter(function (w) { return w.id !== id; });
        write(WISH_KEY, wishlist);
        window.DengageEvents.removeFromWishlist({
            id: saved.id,
            variantId: saved.variantId
        }, saved.listName);
        announce();
    }

    function toggleWishlist(product) {
        var listName = listFor(product);
        if (isSaved(product.id)) {
            wishlist = wishlist.filter(function (w) { return w.id !== product.id; });
            write(WISH_KEY, wishlist);
            window.DengageEvents.removeFromWishlist(product, listName);
        } else {
            wishlist.push({
                id: product.id, name: product.name, listName: listName,
                price: product.price, discountedPrice: product.discountedPrice,
                image: product.image || null
            });
            write(WISH_KEY, wishlist);
            window.DengageEvents.addToWishlist({
                id: product.id,
                price: product.price,
                discountedPrice: product.discountedPrice,
                stockCount: product.stockCount
            }, listName);
        }
        announce();
        return isSaved(product.id);
    }

    window.Store = {
        cart: function () { return cart.slice(); },
        cartCount: cartCount,
        cartTotal: cartTotal,
        addToCart: addToCart,
        removeFromCart: removeFromCart,
        clearCart: clearCart,
        beginCheckout: beginCheckout,
        placeOrder: placeOrder,
        wishlist: function () { return wishlist.slice(); },
        isSaved: isSaved,
        toggleWishlist: toggleWishlist,
        removeFromWishlist: removeFromWishlist,
        onChange: function (fn) { listeners.push(fn); },
        keys: { cart: CART_KEY, wishlist: WISH_KEY }
    };
})(window);

;

/* panels.js */
/* Dengage eComm Demo. Generated file. Sources and notes live in the factory. */
(function (window, document) {
    'use strict';

    var $ = function (sel) { return document.querySelector(sel); };

    var SCENARIOS = [

        { slug: 'subscription-popup', name: 'Subscription',     group: 'onsite' },
        { slug: 'survey',             name: 'Survey',           group: 'onsite' },
        { slug: 'nps-popup',          name: 'NPS',              group: 'onsite' },
        { slug: 'image-popup',        name: 'Image popup',      group: 'onsite' },
        { slug: 'horizontal-popup',   name: 'Horizontal popup', group: 'onsite' },
        { slug: 'cta-image-popup',    name: 'CTA image popup',  group: 'onsite' },
        { slug: 'sticky-bar',         name: 'Sticky bar',       group: 'onsite' },
        { slug: 'image-bar',          name: 'Image bar',        group: 'onsite' },
        { slug: 'slide-in',           name: 'Slide in',         group: 'onsite' },
        { slug: 'exit-intent',        name: 'Exit intent',      group: 'onsite',
          gesture: 'gestureExitIntent' },
        { slug: 'scroll-depth',       name: 'Scroll depth',     group: 'onsite',
          gesture: 'gestureScrollDepth' },

        { slug: 'ab-test',            name: 'A/B test',         group: 'abtest' },

        { slug: 'spin-to-win',        name: 'Spin to win',      group: 'game' },
        { slug: 'scratch-card',       name: 'Scratch card',     group: 'game' },
        { slug: 'countdown-to-win',   name: 'Countdown to win',  group: 'game' },

        { slug: 'inline-below-header',    name: 'Below header',    group: 'inline',
          target: 'dn_inline_target_below_header' },
        { slug: 'inline-below-hero',      name: 'Below hero',      group: 'inline',
          target: 'dn_inline_target_below_hero' },
        { slug: 'inline-in-grid',         name: 'In grid',         group: 'inline',
          target: 'dn_inline_target_in_grid' },
        { slug: 'inline-pdp-below-price', name: 'Below price',     group: 'inline',
          target: 'dn_inline_target_pdp_below_price' },
        { slug: 'inline-above-footer',    name: 'Above footer',    group: 'inline',
          target: 'dn_inline_target_above_footer' },

        { slug: 'story',          name: 'Story',          group: 'onsite', panel: true },

        { slug: 'video-popup',    name: 'Video popup',    group: 'onsite', panel: true,
          action: 'video-open', actionCopy: 'Plays the demo film here' },
        { slug: 'vertical-popup', name: 'Vertical popup', group: 'onsite' },

        { slug: 'web-push',       name: 'Web push',       group: 'push',
          action: 'push-prompt', actionCopy: 'actionPushPrompt' },

        { slug: 'inbox',          name: 'App inbox',      group: 'inbox',
          action: 'inbox-open', actionCopy: 'actionInboxOpen', target: 'inbox-body' }
    ];

    var GROUPS = [
        { id: 'onsite', copy: 'groupOnsite' },
        { id: 'abtest', copy: 'groupAbTest' },
        { id: 'game',   copy: 'groupGame' },
        { id: 'inline', copy: 'groupInline' },

        { id: 'push',   copy: 'groupPush' },
        { id: 'inbox',  copy: 'groupInbox' }
    ];

    var EVENTS = [
        { id: 'pageView',              label: 'Page view',         table: 'page_view_events' },
        { id: 'ec:addToCart',          label: 'Add to cart',        table: 'shopping_cart_events' },
        { id: 'ec:removeFromCart',     label: 'Remove from cart',   table: 'shopping_cart_events' },
        { id: 'ec:beginCheckout',      label: 'Begin checkout',     table: 'shopping_cart_events' },
        { id: 'ec:order',              label: 'Order',              table: 'order_events, order_events_detail' },
        { id: 'ec:search',             label: 'Search',             table: 'search_events' },
        { id: 'ec:addToWishlist',      label: 'Add to wishlist',    table: 'wishlist_events' },
        { id: 'ec:removeFromWishlist', label: 'Remove from wishlist', table: 'wishlist_events' }
    ];

    var ALLOWED = EVENTS.map(function (e) { return e.id; });

    function renderRecommendations() {
        var host = $('#rec-grid');
        if (!host || !window.Recommend) return;
        host.innerHTML = window.Recommend.strategies.map(function (s) {
            return '<button type="button" class="scenario" data-reco="' + s.id + '">' +
                '<span class="name">' + s.label + '</span>' +
                '<span class="slug">' + s.note + '</span>' +
            '</button>';
        }).join('');
    }

    function log(message, detail) {
        var pane = $('#panel-log');
        if (!pane) return;
        var time = new Date().toTimeString().slice(0, 8);
        pane.textContent = time + '  ' + message +
            (detail ? '\n' + JSON.stringify(detail, null, 2) : '') +
            '\n\n' + pane.textContent;
    }

    function scenarioPrefix() {
        return (window.DEMO_CONFIG && window.DEMO_CONFIG.dengage &&
                window.DEMO_CONFIG.dengage.scenarioPrefix) || 'dengage_demo_';
    }

    function text(key) {
        return (window.Storefront && window.Storefront.t) ? window.Storefront.t(key) : key;
    }

    function renderLauncher() {
        var host = $('#launcher-grid');
        if (!host) return;
        var prefix = scenarioPrefix();

        host.innerHTML = GROUPS.map(function (g) {
            var members = SCENARIOS.filter(function (s) { return s.group === g.id; });
            if (!members.length) return '';

            return '<h3 class="launcher-group">' + text(g.copy) +
                   ' <span>' + members.length + '</span></h3>' +
                members.map(function (s) {

                    if (s.gesture) {
                        return '<button type="button" class="scenario gesture" ' +
                                'data-gesture="' + s.slug + '">' +
                            '<span class="name">' + s.name + '</span>' +
                            '<span class="slug">' + text(s.gesture) + '</span>' +
                        '</button>';
                    }

                    if (s.action) {
                        return '<button type="button" class="scenario action" ' +
                                'data-action="' + s.action + '">' +
                            '<span class="name">' + s.name + '</span>' +
                            '<span class="slug">' + text(s.actionCopy) + '</span>' +
                        '</button>';
                    }

                    var here = !s.target || document.getElementById(s.target);
                    return '<button type="button" class="scenario' + (here ? '' : ' elsewhere') +
                            '" data-scenario="' + s.slug + '">' +
                        '<span class="name">' + s.name + '</span>' +
                        '<span class="slug">' +
                            (here ? prefix + s.slug : text('inlineElsewhere')) +
                        '</span>' +
                    '</button>';
                }).join('');
        }).join('');
    }

    function esc(text) {
        return String(text === null || text === undefined ? '' : text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    var REF_ROWS = [
        { key: 'deviceId',   copy: 'refDevice' },
        { key: 'sessionId',  copy: 'refSession' },
        { key: 'pushToken',  copy: 'refToken' },
        { key: 'contactKey', copy: 'refContact' },

        { key: 'demoUrl',    copy: 'refPageUrl' },
        { key: 'accountId',  copy: 'refAccount' },
        { key: 'appGuid',    copy: 'refApp' }
    ];

    function renderReference() {
        var host = $('#ref-grid');
        if (!host || !window.DengageEvents || !window.DengageEvents.reference) return;

        function paint(values) {
            host.innerHTML = REF_ROWS.map(function (row) {
                var value = values[row.key];
                var missing = !value;
                var shown = missing ? window.Storefront.t('refNone') : String(value);
                return '<div class="ref-row' + (missing ? ' empty' : '') + '">' +
                    '<span class="ref-label">' + window.Storefront.t(row.copy) + '</span>' +
                    '<code class="ref-value"' + (missing ? '' : ' title="' + esc(String(value)) + '"') +
                        '>' + esc(shown) + '</code>' +
                    (missing ? '' :
                      '<button type="button" class="ref-copy" data-ref-copy="' + esc(String(value)) + '" ' +
                      'aria-label="' + esc(window.Storefront.t('refCopy')) + '">' +
                      window.Storefront.t('refCopy') + '</button>') +
                '</div>';
            }).join('');
        }

        paint({});
        window.DengageEvents.reference(paint);
    }

    function wireReference() {
        var host = $('#ref-grid');
        if (!host) return;
        host.addEventListener('click', function (event) {
            var button = event.target.closest
                ? event.target.closest('[data-ref-copy]') : null;
            if (!button) return;
            var value = button.getAttribute('data-ref-copy');
            if (!window.navigator || !window.navigator.clipboard) {
                log('This browser did not offer a clipboard. Select the value instead.');
                return;
            }
            window.navigator.clipboard.writeText(value).then(function () {
                var was = button.textContent;
                button.textContent = window.Storefront.t('refCopied');
                window.setTimeout(function () { button.textContent = was; }, 1200);
            }, function () {
                log('The browser refused the clipboard. Select the value instead.');
            });
        });
    }

    function wireReset() {
        var button = $('#reset-display');
        if (!button) return;
        var armed = null;

        button.addEventListener('click', function () {
            if (armed) {
                armed.forEach(function (pair) {
                    try { window[pair[0]].removeItem(pair[1]); } catch (err) {  }
                });
                log('Cleared ' + armed.length + ' display state key(s)',
                    armed.map(function (p) { return p[0] + ': ' + p[1]; }));
                armed = null;
                button.textContent = window.Storefront.t('launcherReset');
                button.className = 'btn btn-quiet btn-block';
                return;
            }

            var found = [];
            [['localStorage', window.localStorage], ['sessionStorage', window.sessionStorage]]
                .forEach(function (pair) {
                    try {
                        for (var i = 0; i < pair[1].length; i++) {
                            var key = pair[1].key(i);

                            if (/dengage|dn_|__dn|dnpush/i.test(key)) found.push([pair[0], key]);
                        }
                    } catch (err) {  }
                });

            if (!found.length) { log('Nothing to clear. No Dengage keys in storage.'); return; }

            armed = found;
            log('These ' + found.length + ' key(s) will be removed, and nothing else',
                found.map(function (p) { return p[0] + ': ' + p[1]; }));
            button.textContent = 'Confirm: remove ' + found.length + ' key(s)';
            button.className = 'btn btn-block';
        });
    }

    function videoBase() {
        return window.location.pathname.indexOf('/demos/') !== -1
            ? '../../assets/video/'
            : '../assets/video/';
    }

    var VIDEO_CSS =
        '#dps-video{position:fixed;inset:0;z-index:2147482800;display:flex;' +
            'align-items:center;justify-content:center;padding:24px;' +
            'background:var(--scrim);}' +
        '#dps-video .dps-video-frame{width:min(860px,100%);display:flex;' +
            'flex-direction:column;background:var(--surface);color:var(--ink);' +
            'border-radius:var(--radius);box-shadow:var(--shadow-lg);overflow:hidden;}' +
        '#dps-video .dps-video-head{display:flex;align-items:center;' +
            'justify-content:space-between;gap:8px;padding:12px 16px;' +
            'border-bottom:1px solid var(--line);font-family:var(--display-font);}' +
        '#dps-video .dps-video-head strong{font-size:14px;}' +
        '#dps-video .dps-video-close{border:0;background:transparent;' +
            'color:var(--muted);font:inherit;font-size:20px;line-height:1;' +
            'cursor:pointer;padding:2px 8px;border-radius:6px;}' +
        '#dps-video .dps-video-close:hover,#dps-video .dps-video-close:focus{' +
            'color:var(--ink);background:var(--tint);}' +

        '#dps-video .dps-video-media{display:block;width:100%;' +
            'max-height:min(62vh,480px);background:var(--ink);}' +
        '#dps-video .dps-video-foot{display:flex;align-items:center;gap:12px;' +
            'padding:10px 16px;}' +
        '#dps-video .dps-video-sound{border:0;border-radius:var(--radius);' +
            'background:var(--primary);color:var(--on-primary);font:inherit;' +
            'font-size:13px;font-weight:600;padding:8px 16px;cursor:pointer;}' +
        '#dps-video .dps-video-note{font-size:12px;color:var(--muted);}';

    function ensureVideoStyles() {
        if (document.getElementById('dps-video-style')) return;
        var style = document.createElement('style');
        style.id = 'dps-video-style';
        style.textContent = VIDEO_CSS;
        document.head.appendChild(style);
    }

    function openVideo(opener) {
        ensureVideoStyles();

        var previous = document.getElementById('dps-video');
        if (previous && previous.__dpsClose) previous.__dpsClose();

        var base = videoBase();
        var root = document.createElement('div');
        root.id = 'dps-video';
        root.innerHTML =
            '<div class="dps-video-frame" role="dialog" aria-modal="true" ' +
                'aria-label="Demo video">' +
              '<div class="dps-video-head">' +
                '<strong>Dengage eComm demo</strong>' +
                '<button type="button" class="dps-video-close" aria-label="Close">' +
                    '&times;</button>' +
              '</div>' +

              '<video class="dps-video-media" autoplay muted playsinline controls ' +
                'poster="' + base + 'dn-ecomm-demo.svg">' +
                '<source src="' + base + 'dn-ecomm-demo.webm" type="video/webm">' +
                '<source src="' + base + 'dn-ecomm-demo.mp4" type="video/mp4">' +
              '</video>' +
              '<div class="dps-video-foot">' +
                '<button type="button" class="dps-video-sound" aria-pressed="false">' +
                    'Sound on</button>' +
                '<span class="dps-video-note">Played from this demo\'s own files.</span>' +
              '</div>' +
            '</div>';

        var media = root.querySelector('.dps-video-media');
        var closeBtn = root.querySelector('.dps-video-close');
        var soundBtn = root.querySelector('.dps-video-sound');

        function close() {

            try { media.pause(); } catch (err) {  }
            document.removeEventListener('keydown', onKey, true);
            if (root.parentNode) root.parentNode.removeChild(root);

            if (opener && opener.focus && document.body.contains(opener)) opener.focus();
        }
        root.__dpsClose = close;

        function onKey(event) {
            if (event.key === 'Escape') close();
        }

        root.addEventListener('click', function (event) {
            if (event.target === root) close();
        });
        closeBtn.addEventListener('click', close);
        document.addEventListener('keydown', onKey, true);

        soundBtn.addEventListener('click', function () {
            media.muted = !media.muted;
            soundBtn.textContent = media.muted ? 'Sound on' : 'Sound off';
            soundBtn.setAttribute('aria-pressed', media.muted ? 'false' : 'true');
        });

        document.body.appendChild(root);
        closeBtn.focus();

        media.muted = true;
        var started = media.play();
        if (started && started.catch) {
            started.catch(function () {  });
        }
    }

    function renderEventPanel() {
        var select = $('#event-select');
        if (!select) return;
        select.innerHTML = EVENTS.map(function (e) {
            return '<option value="' + e.id + '">' + e.label + '</option>';
        }).join('');
        describeEvent();
        select.addEventListener('change', describeEvent);
    }

    function describeEvent() {
        var select = $('#event-select');
        var note = $('#event-note');
        if (!select || !note) return;
        var chosen = EVENTS.filter(function (e) { return e.id === select.value; })[0];
        note.innerHTML = chosen
            ? 'Writes <code>' + chosen.table + '</code>.'
            : '';
    }

    function fire(eventId) {
        if (ALLOWED.indexOf(eventId) === -1) {
            log('Refused: ' + eventId + ' is not one of the storefront events', { allowed: ALLOWED });
            return false;
        }

        var product = window.Catalog.all()[0];
        var lines = window.Store.cart();
        var events = window.DengageEvents;
        var sent;

        switch (eventId) {
            case 'pageView':
                sent = events.pageview(document.body.getAttribute('data-page-type') || 'other');
                break;
            case 'ec:addToCart':
                sent = events.addToCart({ id: product.id, quantity: 1, price: product.price,
                                          discountedPrice: product.discountedPrice }, lines);
                break;
            case 'ec:removeFromCart':
                sent = events.removeFromCart({ id: product.id, quantity: 1, price: product.price,
                                               discountedPrice: product.discountedPrice }, lines);
                break;
            case 'ec:beginCheckout':
                sent = events.beginCheckout(lines);
                break;
            case 'ec:order':
                sent = events.order({
                    orderId: 'DPS-' + events.slug + '-panel-' + Date.now(),
                    itemCount: 1,
                    totalAmount: window.Catalog.effectivePrice(product),
                    paymentMethod: 'credit_card'
                }, lines.length ? lines : [{ id: product.id, quantity: 1, price: product.price }]);
                break;
            case 'ec:search':
                sent = events.search(product.category, window.Catalog.inCategory(product.category).length);
                break;
            case 'ec:addToWishlist':
                sent = events.addToWishlist({ id: product.id, price: product.price,
                                              discountedPrice: product.discountedPrice,
                                              stockCount: product.stockCount }, 'favorites');
                break;
            case 'ec:removeFromWishlist':
                sent = events.removeFromWishlist({ id: product.id }, 'favorites');
                break;
            default:
                return false;
        }

        log('Sent ' + eventId, sent);
        return true;
    }

    function init() {
        renderLauncher();
        renderEventPanel();
        renderRecommendations();
        wireReset();
        renderReference();
        wireReference();

        document.addEventListener('click', function (event) {

            var hint = event.target.closest ? event.target.closest('[data-gesture]') : null;
            if (hint) {
                var slug = hint.getAttribute('data-gesture');
                var entry = SCENARIOS.filter(function (s) { return s.slug === slug; })[0];
                log(scenarioPrefix() + slug + ' is not fired from here. ' +
                    (entry ? text(entry.gesture) : ''));
                if (window.Storefront) window.Storefront.closeOverlays();
                return;
            }

            var act = event.target.closest ? event.target.closest('[data-action]') : null;
            if (act && act.getAttribute('data-action') === 'inbox-open') {

                if (window.Storefront) {
                    window.Storefront.closeOverlays();
                    window.Storefront.openOverlay('#inbox');
                }
                if (window.Inbox) {
                    window.Inbox.refresh().then(function (status) {
                        if (status === 'ok') {
                            log('Inbox read. ' + window.Inbox.unreadCount() +
                                ' unread of the messages Dengage holds for this device.');
                        } else if (status === 'starting') {
                            log('The inbox needs a device id, which the application ' +
                                'creates a moment after it loads. Press Refresh in the drawer.');
                        } else {
                            log('Dengage could not return this inbox. The console has the reason.');
                        }
                    });
                }
                return;
            }
            if (act && act.getAttribute('data-action') === 'video-open') {

                if (window.Storefront) window.Storefront.closeOverlays();
                openVideo(act);
                log('Playing the demo film from this demo\'s own files. The panel\'s ' +
                    'native Video Popup template streams the same film when its ' +
                    'campaign fires; nothing was fired here, so the two never stack.');
                return;
            }
            if (act) {
                var events = window.DengageEvents;
                if (!events.pushSupported()) {
                    log('Web push is not available in this browser. It needs a secure ' +
                        'origin and a service worker, so it will not work from a file:// page.');
                    return;
                }
                log('Permission before asking: ' + (events.pushStatus() || 'unknown'));
                events.pushPrompt();

                setTimeout(function () {
                    log('Permission now: ' + (events.pushStatus() || 'unknown') +
                        '. Granted means the device is subscribed and a campaign or ' +
                        'journey in the panel can reach it.');
                }, 1500);
                if (window.Storefront) window.Storefront.closeOverlays();
                return;
            }

            var el = event.target.closest ? event.target.closest('[data-scenario]') : null;
            if (el) {
                var fired = el.getAttribute('data-scenario');
                var spec = SCENARIOS.filter(function (s) { return s.slug === fired; })[0];

                if (spec && spec.target && !document.getElementById(spec.target)) {
                    log(scenarioPrefix() + fired + ' renders into #' + spec.target +
                        ', which is not on this page. ' + text('inlineElsewhere'));
                    if (window.Storefront) window.Storefront.closeOverlays();
                    return;
                }

                var name = window.DengageEvents.scenario(fired);

                log('Fired ' + name + '. ' +
                    (fired.indexOf('inline-') === 0
                        ? 'Inline content renders into its slot in the page rather than over it.'
                        : 'If nothing appears, no campaign has that trigger name.'));

                if (window.Storefront) window.Storefront.closeOverlays();
                return;
            }
            var reco = event.target.closest ? event.target.closest('[data-reco]') : null;
            if (reco) {
                var id = reco.getAttribute('data-reco');
                var result = window.Recommend.render(id, '#rec-rail', 6);
                var strategy = window.Recommend.get(id);
                log('Rendered ' + (strategy ? strategy.label : id) +
                    ': ' + (result ? result.count : 0) + ' item(s) from this demo\'s catalogue.',
                    strategy ? { strategy: id, how: strategy.explain } : null);

                if (window.Storefront) window.Storefront.closeOverlays();
                var section = document.getElementById('recommendations');
                if (section && section.scrollIntoView) {
                    setTimeout(function () {
                        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 220);
                }
                return;
            }
            if (event.target.id === 'event-send') {
                var select = $('#event-select');
                if (select) fire(select.value);
            }
        });
    }

    window.Panels = { init: init, SCENARIOS: SCENARIOS, GROUPS: GROUPS,
                      EVENTS: EVENTS, fire: fire };
})(window, document);

;

/* slots.js */
/* Dengage eComm Demo. Generated file. Sources and notes live in the factory. */
(function (window, document) {
    'use strict';

    function looksLikeBanner(el, header) {
        if (!el || el === header || el.contains(header) || header.contains(el)) return false;
        var style = window.getComputedStyle(el);
        if (style.position !== 'fixed' || style.display === 'none') return false;
        if (style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        var box = el.getBoundingClientRect();
        if (box.top > 2 || box.height <= 0 || box.height > 200) return false;
        return box.width >= window.innerWidth * 0.9;
    }

    function findBanner(header) {
        var children = document.body.children;
        for (var i = 0; i < children.length; i++) {
            var el = children[i];
            if (looksLikeBanner(el, header)) return el;
            var inner = el.children;
            for (var j = 0; j < inner.length; j++) {
                if (looksLikeBanner(inner[j], header)) return inner[j];
            }
        }
        return null;
    }

    var banner = null;

    var reported = null;

    function readBannerReport(event) {
        if (!event.data || event.data.dnBanner !== 'height') return;
        var px = Number(event.data.px);
        if (!isFinite(px) || px < 0 || px > 240) return;
        reported = Math.round(px);
        measure();
    }

    function bannerBottom(header) {

        if (reported !== null && reported > 0) return reported;
        if (banner && !document.body.contains(banner)) banner = null;
        if (banner && !looksLikeBanner(banner, header)) banner = null;
        if (!banner) return 0;
        var box = banner.getBoundingClientRect();
        return Math.round(box.bottom);
    }

    function rescan() {
        var header = document.querySelector('.site-header');
        if (!header) return;
        banner = findBanner(header);
        measure();
    }

    function measure() {
        var header = document.querySelector('.site-header');
        if (!header) return;

        document.documentElement.style.setProperty(
            '--dn-banner-height', bannerBottom(header) + 'px');

        var bottom = header.getBoundingClientRect().bottom;

        if (bottom < 0 || bottom > 400) return;
        document.documentElement.style.setProperty('--dn-header-clearance', Math.round(bottom) + 'px');
    }

    function init() {
        rescan();

        window.addEventListener('scroll', measure, { passive: true });
        window.addEventListener('resize', measure, { passive: true });

        window.addEventListener('message', readBannerReport);

        if (window.MutationObserver) {
            var observer = new MutationObserver(function () { rescan(); });

            observer.observe(document.body, { childList: true, subtree: true });
        }

        var ticks = 0;
        var timer = setInterval(function () {
            rescan();
            if (++ticks > 10) clearInterval(timer);
        }, 200);
    }

    window.Slots = { init: init, measure: measure, rescan: rescan };
})(window, document);

;

/* inbox.js */
/* Dengage eComm Demo. Generated file. Sources and notes live in the factory. */
(function (window, document) {
    'use strict';

    function config() { return window.DEMO_CONFIG || {}; }
    function copy() { return window.DEMO_COPY || {}; }

    var $ = function (sel, root) { return (root || document).querySelector(sel); };

    function t(key, vars) {
        var text = copy()[key] || key;
        Object.keys(vars || {}).forEach(function (name) {
            text = text.replace('{' + name + '}', vars[name]);
        });
        return text;
    }

    var slug = window.DEMO_SLUG || 'demo';
    var READ_KEY = 'dps:' + slug + ':inbox-read';
    var HIDDEN_KEY = 'dps:' + slug + ':inbox-hidden';

    function read(key) {
        try {
            var raw = window.localStorage.getItem(key);
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) { return []; }
    }

    function write(key, value) {
        try { window.localStorage.setItem(key, JSON.stringify(value)); }
        catch (err) {  }
    }

    var readIds = read(READ_KEY);
    var hiddenIds = read(HIDDEN_KEY);
    var messages = [];
    var state = 'starting';
    var reported = {};

    function pick(message, names) {
        var sources = [message, message && message.messageJson, message && message.message_json];
        for (var s = 0; s < sources.length; s++) {
            var source = sources[s];
            if (!source || typeof source !== 'object') continue;
            for (var n = 0; n < names.length; n++) {
                var value = source[names[n]];
                if (value !== null && value !== undefined && value !== '') return value;
            }
        }
        return null;
    }

    function messageId(message) {
        var id = pick(message, ['smsgId', 'smsg_id', 'messageId', 'id']);
        return id === null ? null : String(id);
    }

    function messageTitle(message) {
        var value = pick(message, ['title', 'messageTitle', 'header', 'subject']);
        return value === null ? null : String(value);
    }

    function messageBody(message) {
        var value = pick(message, ['message', 'body', 'messageBody', 'text', 'content']);
        return value === null ? null : String(value);
    }

    function messageMedia(message) {
        var value = pick(message, ['mediaUrl', 'media_url', 'media', 'image',
                                   'imageUrl', 'image_url', 'iconUrl', 'icon']);
        if (value === null) return null;
        var text = String(value);
        return /^https?:\/\//i.test(text) ? text : null;
    }

    function messageUrl(message) {
        var value = pick(message, ['targetUrl', 'target_url', 'url', 'link', 'deepLink']);
        if (value === null) return null;
        var text = String(value);
        return /^https?:\/\//i.test(text) ? text : null;
    }

    function messageDate(message) {
        var value = pick(message, ['sendDate', 'sentDate', 'receivedDate', 'createDate',
                                   'sent_time', 'sentTime', 'eventDate', 'date']);
        if (value === null) return null;
        var when = new Date(value);
        return isFinite(when.getTime()) ? when : null;
    }

    function messageButtons(message) {
        var list = pick(message, ['actionButtons', 'action_buttons', 'buttons', 'actions']);
        if (!Array.isArray(list)) return [];
        return list.map(function (button, index) {
            if (!button || typeof button !== 'object') return null;
            var label = button.text || button.title || button.label || button.caption;
            if (!label) return null;
            return {
                id: String(button.id || button.buttonId || button.action || ('button-' + index)),
                label: String(label),
                url: /^https?:\/\//i.test(String(button.targetUrl || button.url || ''))
                    ? String(button.targetUrl || button.url) : null
            };
        }).filter(Boolean);
    }

    function visible() {
        return messages.filter(function (message) {
            var id = messageId(message);
            return id !== null && hiddenIds.indexOf(id) === -1;
        });
    }

    function unreadCount() {
        return visible().filter(function (message) {
            return readIds.indexOf(messageId(message)) === -1;
        }).length;
    }

    function escapeText(value) {
        return window.Catalog && window.Catalog.escapeText
            ? window.Catalog.escapeText(value)
            : String(value === null || value === undefined ? '' : value)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
    }

    function stamp(when) {
        if (!when) return '';
        var mins = Math.round((Date.now() - when.getTime()) / 60000);
        if (mins < 1) return t('inboxJustNow');
        if (mins < 60) return t('inboxMinutes', { n: mins });
        if (mins < 60 * 24) return t('inboxHours', { n: Math.round(mins / 60) });
        try {
            return when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        } catch (err) {
            return t('inboxHours', { n: Math.round(mins / 60) });
        }
    }

    function emptyBlock() {
        if (state === 'dry') {
            return '<p class="empty">' + t('inboxNoSdk') + '</p>';
        }
        if (state === 'starting') {
            return '<p class="empty">' + t('inboxStarting') + '</p>';
        }
        if (state === 'error') {
            return '<p class="empty">' + t('inboxError') + '</p>';
        }
        return '<p class="empty">' + t('inboxEmpty') + '</p>' +
               '<p class="empty-hint">' + t('inboxEmptyHint') + '</p>';
    }

    function messageBlock(message) {
        var id = messageId(message);
        var isRead = readIds.indexOf(id) !== -1;
        var title = messageTitle(message);
        var body = messageBody(message);
        var media = messageMedia(message);
        var url = messageUrl(message);
        var when = messageDate(message);
        var buttons = messageButtons(message);

        var html = '<article class="inbox-item' + (isRead ? ' read' : ' unread') +
                   '" data-inbox-id="' + escapeText(id) + '">';

        if (media) {
            html += '<div class="inbox-media"><img src="' + escapeText(media) +
                    '" alt="" loading="lazy"></div>';
        } else {
            html += '<div class="inbox-media empty"></div>';
        }

        html += '<div class="inbox-text">';
        html += '<div class="inbox-top">';

        html += '<h3>' + (isRead ? '' : '<span class="dot" aria-hidden="true"></span>') +
                escapeText(title || t('inboxUntitled')) + '</h3>';
        if (when) html += '<span class="inbox-when">' + escapeText(stamp(when)) + '</span>';
        html += '</div>';
        if (body) html += '<p>' + escapeText(body) + '</p>';

        html += '<div class="inbox-actions">';
        if (url) {

            html += '<a class="btn btn-small" href="' + escapeText(url) +
                    '" target="_blank" rel="noopener"' +
                    ' data-inbox-open="' + escapeText(id) + '">' + t('inboxOpen') + '</a>';
        }
        buttons.forEach(function (button) {
            html += '<button type="button" class="btn btn-small btn-quiet"' +
                    ' data-inbox-button="' + escapeText(button.id) + '"' +
                    ' data-inbox-id="' + escapeText(id) + '"' +
                    (button.url ? ' data-inbox-href="' + escapeText(button.url) + '"' : '') +
                    '>' + escapeText(button.label) + '</button>';
        });

        html += '<button type="button" class="link-btn dismiss" data-inbox-dismiss="' +
                escapeText(id) + '">' + t('inboxDismiss') + '</button>';
        html += '</div>';

        html += '</div></article>';
        return html;
    }

    function render() {
        var body = $('#inbox-body');
        var list = visible();
        var n = unreadCount();

        if (body) {
            body.innerHTML = list.length
                ? list.map(messageBlock).join('')
                : emptyBlock();

            var anyMedia = list.some(function (message) { return !!messageMedia(message); });
            body.classList.toggle('with-media', anyMedia);
        }

        var count = $('#inbox-count');
        if (count) {
            count.textContent = n ? t('inboxUnread', { n: n }) : '';
            count.hidden = n === 0;
        }

        var badge = $('#inbox-badge');
        if (badge) {
            badge.textContent = n;
            badge.hidden = n === 0;
        }

        hideBrokenMedia();

        if (isOpen()) reportImpressions(list);
    }

    function hideBrokenMedia() {
        var images = document.querySelectorAll('#inbox-body .inbox-media img');
        Array.prototype.forEach.call(images, function (img) {

            if (img.complete && img.naturalWidth === 0) { drop(img); return; }
            img.addEventListener('error', function () { drop(img); });
        });
        function drop(img) {
            var holder = img.parentNode;
            if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
        }
    }

    function isOpen() {
        var drawer = $('#inbox');
        return !!(drawer && drawer.classList.contains('open'));
    }

    function reportImpressions(list) {
        list.forEach(function (message) {
            var id = messageId(message);
            if (!id || reported[id]) return;
            reported[id] = true;
            window.DengageEvents.inboxImpression(id);
        });
    }

    var refreshing = false;

    function refresh() {
        if (refreshing) return Promise.resolve(state);
        refreshing = true;
        return window.DengageEvents.inboxMessages().then(function (result) {
            refreshing = false;
            state = result.status;
            messages = result.list;
            if (window.console && messages.length) {

                console.log('[inbox] ' + messages.length + ' message(s), first raw:', messages[0]);
            }
            render();
            return state;
        }, function () {
            refreshing = false;
            state = 'error';
            render();
            return state;
        });
    }

    function settle(tries) {
        tries = tries || 0;
        return refresh().then(function (status) {
            if (status !== 'starting' || tries >= 5) return status;
            return new Promise(function (resolve) {
                window.setTimeout(function () { resolve(settle(tries + 1)); }, 1000 * (tries + 2));
            });
        });
    }

    function markRead(id) {
        if (!id || readIds.indexOf(id) !== -1) return;
        readIds.push(id);
        write(READ_KEY, readIds);
    }

    function open(id) {
        markRead(id);
        window.DengageEvents.inboxOpen(id);
        render();
    }

    function click(id, buttonId) {
        markRead(id);
        window.DengageEvents.inboxClick(id, buttonId);
        render();
    }

    function dismiss(id) {
        if (!id) return;
        if (hiddenIds.indexOf(id) === -1) {
            hiddenIds.push(id);
            write(HIDDEN_KEY, hiddenIds);
        }
        window.DengageEvents.inboxDelete(id);
        render();
    }

    function wire() {
        var body = $('#inbox-body');
        if (!body) return;

        body.addEventListener('click', function (event) {
            var el = event.target.closest
                ? event.target.closest('[data-inbox-open],[data-inbox-button],[data-inbox-dismiss]')
                : null;
            if (!el) return;

            if (el.hasAttribute('data-inbox-dismiss')) {
                event.preventDefault();
                dismiss(el.getAttribute('data-inbox-dismiss'));
                return;
            }
            if (el.hasAttribute('data-inbox-button')) {
                event.preventDefault();
                var buttonId = el.getAttribute('data-inbox-button');
                var owner = el.getAttribute('data-inbox-id');
                click(owner, buttonId);
                var href = el.getAttribute('data-inbox-href');
                if (href) window.open(href, '_blank', 'noopener');
                return;
            }

            open(el.getAttribute('data-inbox-open'));
        });

        var refreshBtn = $('#inbox-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () { refresh(); });
        }

        var trigger = document.querySelector('[data-open="#inbox"]');
        if (trigger) {
            trigger.addEventListener('click', function () {
                refresh();
            });
        }
    }

    function boot() {
        wire();
        render();
        settle();
    }

    window.Inbox = {
        boot: boot,

        refresh: refresh,
        unreadCount: unreadCount,

        parse: {
            id: messageId,
            title: messageTitle,
            body: messageBody,
            media: messageMedia,
            url: messageUrl,
            date: messageDate,
            buttons: messageButtons
        },
        keys: { read: READ_KEY, hidden: HIDDEN_KEY }
    };
})(window, document);

;

/* debug.js */
/* Dengage eComm Demo. Generated file. Sources and notes live in the factory. */
(function (window, document) {
    'use strict';

    var PARAM = 'debug';
    var MAX_ROWS = 40;

    function slug() {
        return window.DEMO_SLUG || (window.DEMO_CONFIG && window.DEMO_CONFIG.slug) || 'demo';
    }

    function storeKey() { return 'dps:' + slug() + ':debug'; }
    function eventName() { return 'dps:' + slug() + ':event'; }

    function wanted() {
        var value = null;
        try {
            value = new URLSearchParams(window.location.search).get(PARAM);
        } catch (err) { value = null; }

        if (value === '1' || value === 'true' || value === 'on') {
            try { window.sessionStorage.setItem(storeKey(), '1'); } catch (err) {  }
            return true;
        }
        if (value === '0' || value === 'false' || value === 'off') {
            try { window.sessionStorage.removeItem(storeKey()); } catch (err) {  }
            return false;
        }
        try {
            return window.sessionStorage.getItem(storeKey()) === '1';
        } catch (err) {
            return false;
        }
    }

    if (!wanted()) return;

    var rows = [];
    var panel = null;
    var list = null;
    var countEl = null;

    function esc(text) {
        return String(text === null || text === undefined ? '' : text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function clock(at) {
        var d = new Date(at);
        function two(n) { return (n < 10 ? '0' : '') + n; }
        return two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
    }

    var TABLES = {
        'pageView': 'page_view_events',
        'ec:addToCart': 'shopping_cart_events',
        'ec:removeFromCart': 'shopping_cart_events',
        'ec:deleteCart': 'shopping_cart_events',
        'ec:beginCheckout': 'shopping_cart_events',
        'ec:order': 'order_events + order_events_detail',
        'ec:cancelOrder': 'order_events',
        'ec:addToWishlist': 'wishlist_events',
        'ec:removeFromWishlist': 'wishlist_events',
        'ec:search': 'search_events'
    };

    function isDengage(url) {
        return String(url || '').indexOf('dengage.com') !== -1;
    }

    function hostOf(url) {
        try { return new URL(String(url), window.location.href).host; }
        catch (err) { return String(url).split('/')[2] || String(url); }
    }
    function pathOf(url) {
        try { return new URL(String(url), window.location.href).pathname; }
        catch (err) { return ''; }
    }

    function net(method, url, status, reason, at) {
        add({
            kind: 'net',
            method: method,
            host: hostOf(url),
            path: pathOf(url),
            status: status,
            reason: reason || '',
            at: at || Date.now()
        });
    }

    function watchTransport() {
        var originalFetch = window.fetch;
        if (typeof originalFetch === 'function') {
            window.fetch = function (input, init) {
                var url = '';
                try { url = typeof input === 'string' ? input : (input && input.url) || ''; }
                catch (err) { url = ''; }
                if (!isDengage(url)) return originalFetch.apply(this, arguments);
                var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
                var at = Date.now();
                return originalFetch.apply(this, arguments).then(function (response) {
                    net(method, url, response.status, '', at);
                    return response;
                }, function (err) {
                    net(method, url, 0, (err && err.message) || 'no response', at);
                    throw err;
                });
            };
        }

        var XHR = window.XMLHttpRequest;
        if (XHR && XHR.prototype && XHR.prototype.send && XHR.prototype.open) {
            var open = XHR.prototype.open;
            var send = XHR.prototype.send;
            XHR.prototype.open = function (method, url) {
                this.__dpsMethod = String(method || 'GET').toUpperCase();
                this.__dpsUrl = String(url || '');
                return open.apply(this, arguments);
            };
            XHR.prototype.send = function () {
                var self = this;
                if (isDengage(self.__dpsUrl)) {
                    var at = Date.now();
                    self.addEventListener('load', function () {
                        net(self.__dpsMethod, self.__dpsUrl, self.status, '', at);
                    });
                    self.addEventListener('error', function () {
                        net(self.__dpsMethod, self.__dpsUrl, 0, 'no response', at);
                    });
                    self.addEventListener('timeout', function () {
                        net(self.__dpsMethod, self.__dpsUrl, 0, 'timed out', at);
                    });
                }
                return send.apply(this, arguments);
            };
        }

        var nav = window.navigator;
        if (nav && typeof nav.sendBeacon === 'function') {
            var beacon = nav.sendBeacon.bind(nav);
            nav.sendBeacon = function (url) {
                var queued = beacon.apply(nav, arguments);
                if (isDengage(url)) {
                    net('BEACON', url, queued ? 204 : 0, queued ? '' : 'refused by the browser');
                }
                return queued;
            };
        }
    }

    watchTransport();

    function build() {
        panel = document.createElement('aside');
        panel.id = 'dps-debug';
        panel.setAttribute('aria-label', 'Dengage event readout');
        panel.innerHTML =
            '<div class="dps-debug-head">' +
              '<strong>Events and traffic</strong>' +
              '<span id="dps-debug-count">0</span>' +
              '<button type="button" data-debug-copy title="Copy all as JSON">Copy</button>' +
              '<button type="button" data-debug-clear title="Clear the list">Clear</button>' +
              '<button type="button" data-debug-close title="Hide. Add ?debug=1 to bring it back">&times;</button>' +
            '</div>' +
            '<ol id="dps-debug-list"></ol>' +
            '<p class="dps-debug-foot">What this page sent, and every request to a ' +
            'dengage.com host. An accepted request is still not a stored row: ' +
            'confirm in Data Space.</p>';
        document.body.appendChild(panel);
        list = panel.querySelector('#dps-debug-list');
        countEl = panel.querySelector('#dps-debug-count');

        panel.addEventListener('click', function (event) {
            var t = event.target;
            if (t.hasAttribute && t.hasAttribute('data-debug-close')) {
                try { window.sessionStorage.removeItem(storeKey()); } catch (err) {  }
                panel.remove();
                return;
            }
            if (t.hasAttribute && t.hasAttribute('data-debug-clear')) {
                rows = [];
                render();
                return;
            }
            if (t.hasAttribute && t.hasAttribute('data-debug-copy')) {
                var text = JSON.stringify(rows, null, 2);
                if (window.navigator && window.navigator.clipboard) {
                    window.navigator.clipboard.writeText(text).then(function () {
                        t.textContent = 'Copied';
                        window.setTimeout(function () { t.textContent = 'Copy'; }, 1200);
                    }, function () {  });
                }
            }
        });
    }

    function add(row) {
        rows.unshift(row);
        if (rows.length > MAX_ROWS) rows.length = MAX_ROWS;
        render();
    }

    function renderEvent(row) {
        var table = TABLES[row.action] || '';
        return '<li' + (row.accepted ? '' : ' class="not-sent"') + '>' +
            '<div class="dps-debug-top">' +
              '<code>' + esc(row.action) + '</code>' +
              '<span class="dps-debug-time">' + esc(clock(row.at)) + '</span>' +
            '</div>' +
            (table ? '<div class="dps-debug-table">' + esc(table) + '</div>' : '') +
            (row.accepted
                ? '<div class="dps-debug-table">handed to the SDK. Look for the request below</div>'
                : '<div class="dps-debug-warn">not sent, no application on this page</div>') +
            '<pre>' + esc(JSON.stringify(row.payload)) + '</pre>' +
        '</li>';
    }

    function renderNet(row) {
        var ok = row.status >= 200 && row.status < 400;
        var outcome = row.status
            ? 'HTTP ' + row.status
            : 'no response' + (row.reason ? ', ' + row.reason : '');
        return '<li class="dps-net' + (ok ? '' : ' not-sent') + '">' +
            '<div class="dps-debug-top">' +
              '<code>' + esc(row.method + ' ' + row.host) + '</code>' +
              '<span class="dps-debug-time">' + esc(clock(row.at)) + '</span>' +
            '</div>' +
            '<div class="dps-debug-table">' + esc(row.path) + '</div>' +
            (ok
                ? '<div class="dps-debug-table">' + esc(outcome) + '. Accepted, which is not the same as stored</div>'
                : '<div class="dps-debug-warn">' + esc(outcome) +
                  '. Nothing reached Dengage. A content blocker or a DNS filter on this ' +
                  'device is the usual cause, and it can block one host while allowing ' +
                  'the next</div>') +
        '</li>';
    }

    function render() {
        if (!list) return;
        list.innerHTML = rows.map(function (row) {
            return row.kind === 'net' ? renderNet(row) : renderEvent(row);
        }).join('');
        if (countEl) countEl.textContent = String(rows.length);
    }

    window.addEventListener(eventName(), function (event) {
        var detail = event.detail || {};
        add({
            kind: 'event',
            action: detail.action,
            payload: detail.payload,

            accepted: !!detail.accepted,
            at: detail.at || Date.now()
        });
    });

    if (document.body) build();
    else document.addEventListener('DOMContentLoaded', build);
})(window, document);

;

/* recommend.js */
/* Dengage eComm Demo. Generated file. Sources and notes live in the factory. */
(function (window, document) {
    'use strict';

    var slug = window.DEMO_SLUG || 'demo';
    var VIEWED_KEY = 'dps:' + slug + ':viewed';
    var MAX_VIEWED = 12;

    function readViewed() {
        try {
            var raw = window.sessionStorage.getItem(VIEWED_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (err) { return []; }
    }

    function noteViewed(id) {
        if (!id) return;
        var list = readViewed().filter(function (x) { return x !== id; });
        list.unshift(id);
        list = list.slice(0, MAX_VIEWED);
        try { window.sessionStorage.setItem(VIEWED_KEY, JSON.stringify(list)); }
        catch (err) {  }
    }

    function catalog() { return window.Catalog; }

    function currentProduct() {
        var m = /[?&]id=([^&#]*)/.exec(window.location.search);
        if (!m) return null;
        var id;
        try { id = decodeURIComponent(m[1]); } catch (err) { id = m[1]; }
        return catalog().get(id);
    }

    function without(list, ids) {
        return list.filter(function (p) { return ids.indexOf(p.id) === -1; });
    }

    function seeded(list, seed) {
        var out = list.slice();
        var s = 0, i;
        for (i = 0; i < String(seed).length; i++) s = (s * 31 + String(seed).charCodeAt(i)) % 100003;
        out.sort(function (a, b) {
            var ha = (s + a.id.length * 7 + a.id.charCodeAt(0)) % 1000;
            var hb = (s + b.id.length * 7 + b.id.charCodeAt(0)) % 1000;
            if (ha !== hb) return ha - hb;

            return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
        });
        return out;
    }

    var STRATEGIES = [
        {
            id: 'trending',
            label: 'Trending now',
            note: 'Popular across the store',
            explain: 'Ranked across the whole catalogue, the rail for a home page ' +
                     'where nothing is known about the visitor yet.',
            run: function (limit) {
                return seeded(catalog().all(), slug).slice(0, limit);
            }
        },
        {
            id: 'similar',
            label: 'More like this',
            note: 'Same category as the item being viewed',
            explain: 'Content similarity. Needs a product in context, so it is a ' +
                     'product page rail.',
            needsProduct: true,
            run: function (limit) {
                var p = currentProduct();
                if (!p) return [];
                return catalog().similar(p, limit);
            }
        },
        {
            id: 'also-viewed',
            label: 'Others also viewed',
            note: 'Co-viewing, across categories',
            explain: 'Deliberately crosses category boundaries, which is what ' +
                     'separates it from More like this. On a real engine this is ' +
                     'driven by co-view data.',
            needsProduct: true,
            run: function (limit) {
                var p = currentProduct();
                if (!p) return [];
                return catalog().alsoViewed(p, limit);
            }
        },
        {
            id: 'complete-basket',
            label: 'Completes your basket',
            note: 'From categories the basket does not cover yet',
            explain: 'Reads the cart and suggests from categories it is missing, ' +
                     'rather than more of what is already in it. An empty basket ' +
                     'has nothing to complete, and the rail says so.',
            run: function (limit) {
                var cart = window.Store ? window.Store.cart() : [];
                if (!cart.length) return [];
                var haveIds = cart.map(function (l) { return l.id; });
                var haveCats = {};
                cart.forEach(function (l) {
                    var p = catalog().get(l.id);
                    if (p) haveCats[p.category] = 1;
                });
                var pool = without(catalog().all(), haveIds);

                var fresh = pool.filter(function (p) { return !haveCats[p.category]; });
                return (fresh.length ? fresh : pool).slice(0, limit);
            }
        },
        {
            id: 'recently-viewed',
            label: 'Recently viewed',
            note: 'This visit, most recent first',
            explain: 'Scoped to this visit on purpose, so the rail reflects what was ' +
                     'browsed just now rather than a stale list from an earlier session.',
            run: function (limit) {
                var ids = readViewed();
                var here = currentProduct();
                return ids
                    .filter(function (id) { return !here || id !== here.id; })
                    .map(function (id) { return catalog().get(id); })
                    .filter(Boolean)
                    .slice(0, limit);
            }
        }
    ];

    function get(id) {
        return STRATEGIES.filter(function (s) { return s.id === id; })[0] || null;
    }

    function render(id, hostSelector, limit) {
        var strategy = get(id);
        var host = document.querySelector(hostSelector || '#rec-rail');
        if (!strategy || !host || !catalog()) return null;

        var items = [];
        try { items = strategy.run(limit || 6) || []; }
        catch (err) { if (window.console) console.error('[recommend] ' + id, err); }

        var section = host.closest ? host.closest('.section') : null;
        var title = document.querySelector('#rec-title');
        var note = document.querySelector('#rec-note');
        if (title) title.textContent = strategy.label;
        if (note) note.textContent = strategy.note;

        if (!items.length) {

            var reason = strategy.needsProduct
                ? 'Open a product to see this one.'
                : (id === 'complete-basket'
                    ? 'Add something to the basket and this fills in.'
                    : 'Browse a few products and this fills in.');
            host.innerHTML = '<p class="empty">' + reason + '</p>';
        } else {
            host.innerHTML = items.map(window.Storefront.card).join('');
        }

        if (section) section.hidden = false;
        return { id: id, count: items.length };
    }

    window.Recommend = {
        strategies: STRATEGIES,
        get: get,
        render: render,
        noteViewed: noteViewed,
        viewed: readViewed,
        keys: { viewed: VIEWED_KEY }
    };
})(window, document);

;

/* storefront.js */
/* Dengage eComm Demo. Generated file. Sources and notes live in the factory. */
(function (window, document) {
    'use strict';

    function config() { return window.DEMO_CONFIG || {}; }
    function copy() { return window.DEMO_COPY || {}; }
    function symbol() {
        var locale = config().locale;
        return (locale && locale.currencySymbol) || '$';
    }

    function numberLocale() {
        var locale = config().locale;
        return (locale && locale.numberLocale) || 'en-US';
    }

    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

    function t(key, vars) {
        var text = copy()[key] || key;
        Object.keys(vars || {}).forEach(function (name) {
            text = text.replace('{' + name + '}', vars[name]);
        });
        return text;
    }

    function price(value) {
        if (value === null || value === undefined) return null;
        var amount = Number(value);
        if (!isFinite(amount)) return null;
        var digits;
        try {
            digits = new Intl.NumberFormat(numberLocale(), {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } catch (err) {

            digits = amount.toFixed(2);
        }

        var mark = symbol();
        return mark + (mark.length > 1 ? ' ' : '') + digits;
    }

    function param(name) {
        var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search);
        if (!m) return null;
        try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (err) { return m[1]; }
    }

    function stockLine(product) {
        if (product.stockCount === null) return '';
        if (product.stockCount === 0) return '<div class="card-stock out">' + t('outOfStock') + '</div>';
        if (product.stockCount <= 5) return '<div class="card-stock">' + t('lowStock', { n: product.stockCount }) + '</div>';
        return '';
    }

    function priceBlock(product) {
        var now = price(window.Catalog.effectivePrice(product));
        if (now === null) return '<div class="card-price"><span class="none">' + t('priceOnRequest') + '</span></div>';
        var was = product.discountedPrice !== null ? price(product.price) : null;
        return '<div class="card-price"><span class="now">' + now + '</span>' +
               (was ? '<span class="was">' + was + '</span>' : '') + '</div>';
    }

    var HEART = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-7-9.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7 3.4C19 15.4 12 20 12 20z"/></svg>';

    function card(product) {
        var esc = window.Catalog.escapeAttr;
        return '<article class="card" data-id="' + esc(product.id) + '">' +
            '<div class="card-media">' + window.Catalog.media(product) +
              '<button type="button" class="card-save" data-save="' + esc(product.id) + '" ' +
              'aria-pressed="' + (window.Store.isSaved(product.id) ? 'true' : 'false') + '" ' +
              'aria-label="' + esc(t('save')) + '">' + HEART + '</button>' +
            '</div>' +
            '<div class="card-body">' +
              '<span class="card-cat">' + window.Catalog.escapeText(product.categoryPath) + '</span>' +
              '<h3 class="card-name"><a href="' + esc(product.url) + '">' +
                window.Catalog.escapeText(product.name) + '</a></h3>' +
              priceBlock(product) + stockLine(product) +
              '<button type="button" class="btn btn-block" data-add="' + esc(product.id) + '"' +
                (product.stockCount === 0 ? ' disabled' : '') + '>' +
                (product.stockCount === 0 ? t('outOfStock') : t('addToCart')) + '</button>' +
            '</div>' +
        '</article>';
    }

    function renderInto(selector, list) {
        var host = $(selector);
        if (!host) return;
        host.innerHTML = list.map(card).join('');
    }

    var activeCategory = null;

    function renderNav() {
        var nav = $('#site-nav');
        if (!nav) return;
        var cats = window.Catalog.categories();
        var links = ['<a href="index.html"' + (!activeCategory ? ' aria-current="true"' : '') + '>' +
                     t('navAll') + '</a>'];

        cats.slice(0, 6).forEach(function (c) {
            links.push('<a href="index.html?category=' + encodeURIComponent(c) + '"' +
                (activeCategory === c ? ' aria-current="true"' : '') + '>' +
                window.Catalog.escapeText(c) + '</a>');
        });
        nav.innerHTML = links.join('');
    }

    function renderFilters() {
        var host = $('#filters');
        if (!host) return;
        var cats = window.Catalog.categories();
        host.innerHTML = ['<button type="button" class="chip" data-filter="" aria-pressed="' +
            (!activeCategory ? 'true' : 'false') + '">' + t('filterAll') + '</button>']
            .concat(cats.map(function (c) {
                return '<button type="button" class="chip" data-filter="' + window.Catalog.escapeAttr(c) +
                    '" aria-pressed="' + (activeCategory === c ? 'true' : 'false') + '">' +
                    window.Catalog.escapeText(c) + '</button>';
            })).join('');
    }

    function renderGrid() {
        var list = window.Catalog.inCategory(activeCategory);
        renderInto('#product-grid', list);
        var head = $('#grid-title');
        if (head) head.textContent = activeCategory || t('gridTitle');
        var count = $('#grid-count');
        if (count) count.textContent = t('gridCount', { n: list.length });
    }

    function setCategory(category, fromUser) {
        activeCategory = category || null;
        renderNav();
        renderFilters();
        renderGrid();
        if (fromUser) {

            var sample = window.Catalog.inCategory(activeCategory)[0];
            window.DengageEvents.pageview(activeCategory ? 'category' : 'home', {
                categoryPath: activeCategory ? (sample ? sample.categoryPath.split('>')[0].trim() : activeCategory) : undefined
            });
        }
    }

    function bootHome() {
        activeCategory = param('category');
        renderNav();
        renderFilters();
        renderGrid();

        var rail = $('#rail-featured');
        if (rail) {
            var featured = window.Catalog.all().slice(0, 8);
            rail.innerHTML = featured.map(card).join('');
        }

        window.DengageEvents.pageview(activeCategory ? 'category' : 'home', {
            categoryPath: activeCategory || undefined
        });
    }

    function bootProduct() {
        var product = window.Catalog.get(param('id') || '');
        var host = $('#pdp');
        if (!host) return;

        if (!product) {
            host.innerHTML = '<p class="empty">' + t('searchNone', { q: param('id') || '' }) + '</p>';
            window.DengageEvents.pageview('other');
            return;
        }

        var esc = window.Catalog.escapeAttr;
        var now = price(window.Catalog.effectivePrice(product));
        var was = product.discountedPrice !== null ? price(product.price) : null;

        var attrs = Object.keys(product.attributes).map(function (k) {
            return '<div><dt>' + window.Catalog.escapeText(k) + '</dt><dd>' +
                   window.Catalog.escapeText(product.attributes[k]) + '</dd></div>';
        }).join('');

        host.innerHTML =
            '<div class="pdp-media">' + window.Catalog.media(product) + '</div>' +
            '<div>' +
              '<p class="crumb">' + window.Catalog.escapeText(product.categoryPath) + '</p>' +
              '<h1>' + window.Catalog.escapeText(product.name) + '</h1>' +
              '<div class="price">' +
                (now === null
                  ? '<span class="none">' + t('priceOnRequest') + '</span>'
                  : '<span class="now">' + now + '</span>' + (was ? '<span class="was">' + was + '</span>' : '')) +
              '</div>' +
              stockLine(product) +

              '<div id="dn_inline_target_pdp_below_price"></div>' +
              (attrs ? '<dl class="attrs">' + attrs + '</dl>' : '') +
              '<div class="actions">' +
                '<button type="button" class="btn" data-add="' + esc(product.id) + '"' +
                  (product.stockCount === 0 ? ' disabled' : '') + '>' +
                  (product.stockCount === 0 ? t('outOfStock') : t('addToCart')) + '</button>' +
                '<button type="button" class="btn btn-quiet" data-save="' + esc(product.id) + '" ' +
                  'aria-pressed="' + (window.Store.isSaved(product.id) ? 'true' : 'false') + '">' +
                  (window.Store.isSaved(product.id) ? t('saved') : t('save')) + '</button>' +
              '</div>' +
            '</div>';

        renderInto('#rail-similar', window.Catalog.similar(product, 6));
        renderInto('#rail-viewed', window.Catalog.alsoViewed(product, 6));

        if (window.Recommend) window.Recommend.noteViewed(product.id);

        window.DengageEvents.pageview('product', {
            productId: product.id,
            categoryPath: product.categoryPath,
            price: product.price,
            discountedPrice: product.discountedPrice,
            stockCount: product.stockCount
        });
    }

    function openOverlay(id) {
        var el = $(id);
        if (!el) return;
        el.classList.add('open');
        $('#scrim').classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeOverlays() {
        $$('.drawer, .modal').forEach(function (el) { el.classList.remove('open'); });
        var scrim = $('#scrim');
        if (scrim) scrim.classList.remove('open');
        document.body.style.overflow = '';
    }

    function renderCart() {
        var body = $('#cart-body');
        var foot = $('#cart-foot');
        if (!body) return;
        var lines = window.Store.cart();

        if (!lines.length) {
            body.innerHTML = '<p class="empty">' + t('cartEmpty') + '</p>';
            if (foot) foot.innerHTML = '';
        } else {
            body.innerHTML = lines.map(function (l) {
                var unit = l.discountedPrice !== null && l.discountedPrice !== undefined ? l.discountedPrice : l.price;
                var shown = price(unit === null || unit === undefined ? null : unit * l.quantity);
                return '<div class="line">' +
                    '<div class="line-info">' +
                      '<div class="line-name">' + window.Catalog.escapeText(l.name) + '</div>' +
                      '<div class="line-meta">' + l.quantity + ' x ' +
                        (price(unit) || t('priceOnRequest')) + '</div>' +
                    '</div>' +
                    '<div class="line-name">' + (shown || '') + '</div>' +

                    '<button type="button" class="line-x" data-remove="' +
                      window.Catalog.escapeAttr(l.id) + '" title="' +
                      window.Catalog.escapeAttr(t('cartRemove')) + '" aria-label="' +
                      window.Catalog.escapeAttr(t('cartRemove')) + '">&times;</button>' +
                '</div>';
            }).join('');

            var total = window.Store.cartTotal();
            if (foot) {
                foot.innerHTML =
                    '<div class="total"><span>' + t('cartTotal') + '</span><span>' +
                      (price(total) || t('priceOnRequest')) + '</span></div>' +
                    '<button type="button" class="btn btn-block" id="to-checkout"' +
                      (total === null ? ' disabled' : '') + '>' + t('cartCheckout') + '</button>';
            }
        }

        var badge = $('#cart-badge');
        if (badge) {
            var n = window.Store.cartCount();
            badge.textContent = n;
            badge.hidden = n === 0;
        }
    }

    function renderWishlist() {
        var body = $('#wishlist-body');
        if (!body) return;
        var items = window.Store.wishlist();
        body.innerHTML = items.length
            ? items.map(function (w) {
                return '<div class="line">' +
                    '<div class="line-info">' +
                      '<div class="line-name">' + window.Catalog.escapeText(w.name) + '</div>' +
                      '<div class="line-meta">' + window.Catalog.escapeText(w.listName) + '</div>' +
                    '</div>' +

                    '<button type="button" class="line-x" data-unsave="' +
                      window.Catalog.escapeAttr(w.id) + '" title="' +
                      window.Catalog.escapeAttr(t('wishlistRemove')) + '" aria-label="' +
                      window.Catalog.escapeAttr(t('wishlistRemove')) + '">&times;</button>' +
                '</div>';
              }).join('')
            : '<p class="empty">' + t('wishlistEmpty') + '</p>';

        var badge = $('#wishlist-badge');
        if (badge) { badge.textContent = items.length; badge.hidden = items.length === 0; }
    }

    function keyPrefix() {
        return 'DPS-';
    }

    function currentKey() {
        return (window.DemoIdentity && window.DemoIdentity.contactKey) || null;
    }

    function renderAccount() {
        var host = $('#account-body');
        if (!host) return;
        var key = currentKey();
        var esc = window.Catalog.escapeText;

        if (key) {
            host.innerHTML =
                '<div class="who"><span class="dot"></span><code>' + esc(key) + '</code></div>' +
                '<p class="note">' + t('accountSignedInBody') + '</p>' +
                '<button type="button" class="btn btn-quiet btn-block" id="account-signout" ' +
                    'style="margin-top:16px">' + t('accountSignOut') + '</button>';
        } else {
            host.innerHTML =
                '<h3 style="font-size:14px;margin-bottom:6px">' + t('accountSignInTitle') + '</h3>' +
                '<p class="note" style="margin-top:0">' + t('accountSignInBody') + '</p>' +
                '<div class="field" style="margin-top:14px">' +
                  '<label for="account-key">' + t('accountKeyLabel') + '</label>' +
                  '<div class="affix">' +
                    '<span class="fixed">' + esc(keyPrefix()) + '</span>' +
                    '<input type="text" id="account-key" autocomplete="off" spellcheck="false" ' +
                      'inputmode="text" placeholder="1">' +
                  '</div>' +
                  '<span class="note" style="margin-top:6px;display:block">' + t('accountKeyHint') + '</span>' +
                  '<span class="field-error" id="account-error" hidden></span>' +
                '</div>' +
                '<button type="button" class="btn btn-block" id="account-signin">' +
                  t('accountSignIn') + '</button>' +
                '<div class="divider">' + t('accountRegisterTitle') + '</div>' +
                '<p class="note" style="margin-top:0">' + t('accountRegisterBody') + '</p>' +
                '<button type="button" class="btn btn-quiet btn-block" id="account-register" ' +
                    'style="margin-top:12px">' + t('accountRegister') + '</button>';
        }

        var button = $('#account-btn');
        if (button) {
            if (key) button.setAttribute('data-identified', 'true');
            else button.removeAttribute('data-identified');
        }
    }

    function signIn() {
        var input = $('#account-key');
        var error = $('#account-error');
        if (!input) return;

        var suffix = input.value.trim().toLowerCase().replace(/\s+/g, '-');
        if (!suffix) {
            if (error) {
                error.textContent = t('accountInvalid', { prefix: keyPrefix() });
                error.hidden = false;
            }
            input.focus();
            return;
        }

        var key = keyPrefix() + suffix;
        if (!window.DengageEvents.setContactKey(key)) return;

        window.DemoIdentity.contactKey = key;

        try { window.sessionStorage.setItem(window.DemoIdentity.storageKey, key); } catch (err) {  }

        window.DengageEvents.pageview('login');

        renderAccount();
    }

    function signOut() {
        var storageKey = window.DemoIdentity.storageKey;
        try { window.sessionStorage.removeItem(storageKey); } catch (err) {  }
        try { window.localStorage.removeItem(storageKey); } catch (err) {  }
        window.DemoIdentity.contactKey = null;
        window.DengageEvents.pageview('logout');

        var search = window.location.search
            .replace(/([?&])ck=[^&]*&?/, '$1')
            .replace(/[?&]$/, '');
        setTimeout(function () {
            window.location.href = window.location.pathname + search;
        }, 350);
    }

    function wireAccount() {
        document.addEventListener('click', function (event) {
            var id = event.target.id;
            if (id === 'account-signin') signIn();
            else if (id === 'account-signout') signOut();
            else if (id === 'account-register') {

                closeOverlays();
                window.DengageEvents.scenario('subscription-popup');
            }
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && event.target.id === 'account-key') {
                event.preventDefault();
                signIn();
            }
        });
    }

    var searchTimer = null;
    var lastFired = '';

    function runSearch(term, force) {
        var results = window.Catalog.search(term);
        var host = $('#search-results');
        if (host) {
            host.innerHTML = !term.trim()
                ? ''
                : (results.length
                    ? '<p class="note">' + t('searchCount', { n: results.length, q: term }) + '</p>' +
                      '<div class="grid">' + results.slice(0, 8).map(card).join('') + '</div>'
                    : '<p class="empty">' + t('searchNone', { q: window.Catalog.escapeText(term) }) + '</p>');
        }

        if (term.trim() && (force || term !== lastFired)) {
            lastFired = term;
            window.DengageEvents.search(term, results.length);
        }
    }

    function wireSearch() {
        var input = $('#search-input');
        if (!input) return;
        input.addEventListener('input', function () {
            var term = input.value;
            if (searchTimer) clearTimeout(searchTimer);

            searchTimer = setTimeout(function () { runSearch(term, false); }, 700);
        });
        input.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (searchTimer) clearTimeout(searchTimer);
            runSearch(input.value, true);
        });
    }

    function wireCheckout() {
        document.addEventListener('click', function (event) {
            if (event.target.id === 'to-checkout') {
                window.Store.beginCheckout();
                closeOverlays();
                openOverlay('#checkout');
                var total = window.Store.cartTotal();
                var summary = $('#checkout-summary');
                if (summary) {
                    summary.innerHTML = '<div class="total"><span>' + t('cartTotal') + '</span><span>' +
                        (price(total) || '') + '</span></div>';
                }
            }
            if (event.target.id === 'place-order') {
                var result = window.Store.placeOrder($('#payment-method') ? $('#payment-method').value : 'credit_card');
                var body = $('#checkout-body');
                if (result && body) {
                    body.innerHTML = '<p class="note">' + t('checkoutDone') + '</p>' +
                        '<p class="note">' + t('checkoutRef') + ': <code>' +
                        window.Catalog.escapeText(result.orderId) + '</code></p>' +
                        '<button type="button" class="btn btn-block" data-close="1">' + t('continue') + '</button>';
                }
                renderCart();
            }
        });
    }

    function wire() {
        document.addEventListener('click', function (event) {
            var el = event.target.closest ? event.target.closest('[data-add],[data-save],[data-remove],[data-unsave],[data-filter],[data-open],[data-close]') : null;
            if (!el) return;

            var id;
            if (el.hasAttribute('data-add')) {
                id = el.getAttribute('data-add');
                var product = window.Catalog.get(id);
                if (product) {
                    window.Store.addToCart(product, 1);
                    el.textContent = t('addedToCart');
                    setTimeout(function () { el.textContent = t('addToCart'); }, 1200);
                }
            } else if (el.hasAttribute('data-save')) {
                id = el.getAttribute('data-save');
                var saveProduct = window.Catalog.get(id);
                if (saveProduct) {
                    var saved = window.Store.toggleWishlist(saveProduct);
                    el.setAttribute('aria-pressed', saved ? 'true' : 'false');
                    if (el.classList.contains('btn')) el.textContent = saved ? t('saved') : t('save');
                }
            } else if (el.hasAttribute('data-remove')) {
                window.Store.removeFromCart(el.getAttribute('data-remove'));
            } else if (el.hasAttribute('data-unsave')) {
                window.Store.removeFromWishlist(el.getAttribute('data-unsave'));
            } else if (el.hasAttribute('data-filter')) {
                setCategory(el.getAttribute('data-filter'), true);
            } else if (el.hasAttribute('data-open')) {
                var target = el.getAttribute('data-open');
                openOverlay(target);

                var focusOn = target === '#search' ? '#search-input'
                            : target === '#account' ? '#account-key' : null;
                if (focusOn) {
                    setTimeout(function () {
                        var input = $(focusOn);
                        if (input) input.focus();
                    }, 60);
                }
            } else if (el.hasAttribute('data-close')) {
                closeOverlays();
            }
        });

        var scrim = $('#scrim');
        if (scrim) scrim.addEventListener('click', closeOverlays);
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeOverlays();
        });

        var navToggle = $('#nav-toggle');
        var header = $('#header');
        if (navToggle && header) {
            navToggle.addEventListener('click', function () {
                var open = header.classList.toggle('nav-open');
                navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });

            header.addEventListener('click', function (event) {
                var link = event.target.closest ? event.target.closest('#site-nav a') : null;
                if (!link) return;
                header.classList.remove('nav-open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        }

        window.Store.onChange(function () { renderCart(); renderWishlist(); });
    }

    function boot() {
        var pageType = document.body.getAttribute('data-page-type') || 'other';
        wire();
        wireSearch();
        wireCheckout();
        wireAccount();
        renderCart();
        renderWishlist();
        renderAccount();

        if (pageType === 'product') bootProduct();
        else bootHome();

        if (window.Panels) window.Panels.init();
        if (window.Slots) window.Slots.init();
        if (window.Inbox) window.Inbox.boot();

        openFromUrl();
    }

    var OPENABLE = {
        cart: '#cart',
        checkout: '#checkout',
        search: '#search',
        account: '#account',
        wishlist: '#wishlist'
    };

    function openFromUrl() {
        var wanted = String(param('open') || '').toLowerCase();
        if (!wanted) return;
        var id = OPENABLE[wanted];
        if (!id) return;

        openOverlay(id);
        if (wanted === 'search') {
            var input = $('#search-input');
            if (input) input.focus();
        }
    }

    window.Storefront = {
        boot: boot, card: card, price: price, t: t,
        closeOverlays: closeOverlays,

        openOverlay: openOverlay,

        keyPrefix: keyPrefix
    };
})(window, document);

;

/* boot.js */
/* Dengage eComm Demo. Generated file. Sources and notes live in the factory. */
(function (window, document) {
    'use strict';

    function fetchJson(url) {
        return fetch(url, { cache: 'no-store' }).then(function (response) {
            if (!response.ok) throw new Error(url + ': HTTP ' + response.status);
            return response.json();
        });
    }

    function parseHex(value) {
        var text = String(value || '').trim().replace(/^#/, '');
        if (text.length === 3) {
            text = text.charAt(0) + text.charAt(0) + text.charAt(1) +
                   text.charAt(1) + text.charAt(2) + text.charAt(2);
        }
        if (!/^[0-9a-fA-F]{6}$/.test(text)) return null;
        return [
            parseInt(text.slice(0, 2), 16),
            parseInt(text.slice(2, 4), 16),
            parseInt(text.slice(4, 6), 16)
        ];
    }

    function toHex(rgb) {
        return '#' + rgb.map(function (channel) {
            var n = Math.min(255, Math.max(0, Math.round(channel)));
            return (n < 16 ? '0' : '') + n.toString(16);
        }).join('');
    }

    function luminance(rgb) {
        var parts = rgb.map(function (channel) {
            var c = channel / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
    }

    function contrastRatio(a, b) {
        var la = luminance(a);
        var lb = luminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    var TEXT_CONTRAST = 4.5;
    var TINT = 0.14;

    function washed(brand, surface) {
        return surface.map(function (channel, index) {
            return channel * (1 - TINT) + brand[index] * TINT;
        });
    }

    function brandTextColour(theme) {
        var brand = parseHex(theme.primary);
        var surface = parseHex(theme.surface) || [255, 255, 255];
        var fallback = theme.ink || '#14181b';
        if (!brand) return fallback;

        var wash = washed(brand, surface);

        var colour = brand;
        for (var step = 0; step < 20; step++) {
            if (contrastRatio(colour, surface) >= TEXT_CONTRAST &&
                contrastRatio(colour, wash) >= TEXT_CONTRAST) {
                return toHex(colour);
            }
            colour = colour.map(function (channel) { return channel * 0.88; });
        }
        return fallback;
    }

    function withBrandText(theme) {
        if (!theme) return theme;
        var out = {};
        Object.keys(theme).forEach(function (key) { out[key] = theme[key]; });
        out.brandText = brandTextColour(theme);
        return out;
    }

    function applyTheme(theme) {
        if (!theme) return;
        var root = document.documentElement;
        var map = {
            primary: '--primary', onPrimary: '--on-primary', accent: '--accent',
            ink: '--ink', muted: '--muted', surface: '--surface', page: '--page',
            line: '--line', radius: '--radius', brandText: '--brand-text'
        };
        Object.keys(map).forEach(function (key) {
            if (theme[key]) root.style.setProperty(map[key], theme[key]);
        });
        if (theme.displayFont) {
            root.style.setProperty('--display-font', theme.displayFont + ', Inter, ui-sans-serif, system-ui, sans-serif');
        }
        if (theme.bodyFont) {
            root.style.setProperty('--body-font', theme.bodyFont + ', ui-sans-serif, system-ui, sans-serif');
        }
    }

    function answerThemeRequests(theme) {
        window.addEventListener('message', function (event) {
            if (!event.data || event.data.dnTheme !== 'request') return;
            if (!event.source) return;
            try {
                event.source.postMessage({ dnTheme: 'reply', theme: theme }, '*');
            } catch (err) {

            }
        });
    }

    function applyCopy(copy) {

        Array.prototype.slice.call(document.querySelectorAll('[data-copy]')).forEach(function (el) {
            var key = el.getAttribute('data-copy');
            if (copy[key]) el.textContent = copy[key];
        });
        Array.prototype.slice.call(document.querySelectorAll('[data-copy-attr]')).forEach(function (el) {
            var spec = el.getAttribute('data-copy-attr').split(':');
            if (spec.length === 2 && copy[spec[1]]) el.setAttribute(spec[0], copy[spec[1]]);
        });
    }

    function fail(err) {
        if (window.console) console.error('[boot]', err);
        var main = document.querySelector('main');
        if (main) {
            main.innerHTML = '<div class="container"><p class="empty">' +
                'This demo could not load its catalogue. Serve the repository root and reload.' +
                '</p></div>';
        }
    }

    Promise.all([
        fetchJson('demo.config.json'),
        fetchJson('copy.json'),
        fetchJson('products.json')
    ]).then(function (results) {
        window.DEMO_CONFIG = results[0];
        window.DEMO_COPY = results[1];

        if (results[0].slug && results[0].slug !== window.DEMO_SLUG) {
            if (window.console) {
                console.error('[boot] slug mismatch. demo.config.json says "' + results[0].slug +
                    '", the page markup says "' + window.DEMO_SLUG + '". Storage, contact keys ' +
                    'and order ids use the markup value. Fix the generator so both agree.');
            }
        }

        var themed = withBrandText(results[0].theme);
        applyTheme(themed);

        answerThemeRequests(themed);
        applyCopy(results[1]);

        return window.Catalog.load('products.json');
    }).then(function () {
        window.Storefront.boot();
    }).catch(fail);
})(window, document);

