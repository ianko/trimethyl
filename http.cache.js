/**
 * @class  HTTP.Cache
 * @author  Flavio De Stefano <flavio.destefano@caffeinalab.com>
 * Cache helper for HTTP
 */

/**
 * @type {Object}
 */
var config = _.extend({
}, Alloy.CFG.T.http ? Alloy.CFG.T.http.cache : {});
exports.config = config;

var DB = null;

/**
 * Write the cache
 * @param  {Object} request  The HTTP request
 * @param  {Object} response The HTTP response
 * @param  {Object} info     The HTTP informations
 */
function set(request, response, info) {
	if (DB === null) {
		Ti.API.error('HTTP.Cache: database not open');
		return false;
	}

	DB.execute('INSERT OR REPLACE INTO http (id, expire, creation, content, info) VALUES (?,?,?,?,?)',
		request.hash,
		info.expire,
		require('T/util').timestamp(),
		response.responseData,
		JSON.stringify(info)
		);
}
exports.set = set;


/**
 * Get the associated cache to that request
 * @param  {Object} 	request          		The HTTP request
 * @param  {Boolean} [bypassExpiration] 	Control if bypassing the expiration check
 * @return {Object}
 */
function get(request, bypassExpiration) {
	if (DB === null) {
		Ti.API.error('HTTP.Cache: database not open');
		return false;
	}

	var cacheRow = DB.execute('SELECT expire, creation FROM http WHERE id = ? LIMIT 1', request.hash);
	if (cacheRow.isValidRow() === false) return false;

	var expire = parseInt(cacheRow.fieldByName('expire'), 10) || 0;
	var now = require('T/util').timestamp();

	if ( ! bypassExpiration) {
		Ti.API.debug('HTTP.Cache: REQ-['+request.hash+'] cache values are '+expire+'-'+now+' = '+Math.floor((expire-now)/60)+'min');
		if (expire < now) return false;
	}

	cacheRow = DB.execute('SELECT info, content FROM http WHERE id = ? LIMIT 1', request.hash);
	var content = cacheRow.fieldByName('content');
	if (content == null) {
		Ti.API.error('HTTP.Cache: REQ-['+request.hash+'] has invalid cache content');
		return false;
	}

	var info = require('T/util').parseJSON(cacheRow.fieldByName('info'));
	if (info.mime === 'json') {
		return require('T/util').parseJSON(content);
	} else {
		return content;
	}
}
exports.get = get;


/**
 * Reset all cache
 */
function reset() {
	if (DB === null) {
		Ti.API.error('HTTP.Cache: database not open');
		return false;
	}

	DB.execute('DELETE FROM http WHERE 1');
}
exports.reset = reset;


/**
 * Delete the cache entry for the passed request
 * @param  {String|Object} request [description]
 */
function del(hash) {
	if (DB === null) {
		Ti.API.error('HTTP.Cache: database not open');
		return false;
	}

	DB.execute('DELETE FROM http WHERE id = ?', hash);
}
exports.del = del;


(function init(){

	DB = require('T/db').open();
	if (DB !== null) {
		DB.execute('CREATE TABLE IF NOT EXISTS http (id TEXT PRIMARY KEY, expire INTEGER, creation INTEGER, content TEXT, info TEXT)');
	}

})();