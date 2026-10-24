// Shared rule matching, loaded by the content script, the background worker and the popup.
//
// A rule's targetDomain is a pattern:
//   example.com            the site and all of its subdomains
//   *.example.com          "*" matches any text, so this is subdomains only
//   example.com/r/games    only pages whose path starts with /r/games ("*" works in the path too)

function fsGlobToRegex(glob) {
    return glob.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
}

function fsParsePattern(pattern) {
    const clean = (pattern || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '');
    const slash = clean.indexOf('/');
    return {
        host: slash < 0 ? clean : clean.slice(0, slash),
        path: slash < 0 ? '' : clean.slice(slash)
    };
}

function fsHostMatches(hostPattern, host) {
    if (!hostPattern) return false;
    if (hostPattern.includes('*')) {
        return new RegExp('^' + fsGlobToRegex(hostPattern) + '$').test(host);
    }
    return host === hostPattern || host.endsWith('.' + hostPattern);
}

function fsPathMatches(pathPattern, path) {
    const trimmed = pathPattern.replace(/\/+$/, '');
    if (!trimmed) return true;
    // Match whole path segments, so /r/games doesn't also match /r/gamesdeals
    return new RegExp('^' + fsGlobToRegex(trimmed) + '(?:[/?#]|$)').test(path);
}

function fsRuleMatchesUrl(rule, urlString) {
    if (!rule || rule.enabled === false) return false;
    let url;
    try {
        url = new URL(urlString);
    } catch (e) {
        return false; // Not a valid URL
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const { host, path } = fsParsePattern(rule.targetDomain);
    return fsHostMatches(host, url.hostname.toLowerCase()) &&
        fsPathMatches(path, (url.pathname + url.search).toLowerCase());
}

function fsFindMatchingRule(rules, urlString) {
    return (rules || []).find(rule => fsRuleMatchesUrl(rule, urlString));
}
