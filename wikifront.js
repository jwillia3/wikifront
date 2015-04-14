indexUrl = 'http://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&callback=receivedWiki&titles=';
linkBase = 'http://en.wikipedia.org/wiki/';
selfBase = window.location.origin + window.location.pathname;
wikiName = '';
wikiText = '';
wikiTarget = '';
outHtml = '';

function encodeHtml(text) {
    return text.replace(/&/mg, '&amp;').replace(/</mg, '&lt;').replace(/>/mg, '&gt;');
}
function makeWikiLink(url, name) {
    return '<a title="' + url +
        '" href=' + selfBase + '?q=' + encodeURIComponent(url) + '>' +
        name + '</a>';
}
function renderWiki(name, wiki) {
    // See http://www.mediawiki.org/wiki/Markup_spec#Parser_outline
    function todo(all) {
        return '<div class=unhandled onclick=toggleUnhandled()>&#x273f;<div>' + all + ' </div></div>';
    }
    var extracts = [];
    function makeExternalLink(href, name) {
        return '<a class=external href=' + href + '>' + name + '</a>';
    }
    function preprocessStep(wiki) {
        var replacements = [];
        var nReplacements = 0;
        var leaf = '<span class=wingding>&#x0096;</span>';
        function handleTemplates(all, wiki) {
            var part = wiki.split('|');
            part[0] = part[0].toLowerCase().trim();
            switch (part[0]) {
            case 'about':
                return makeWikiLink(name + ' (disambiguation)',
                    leaf +
                    'This article is about ' + part[1] +
                    '. For other uses, see ' +
                        name + ' (Disambiguation).');
            case 'anchor':
                return '<a id=' + part[1] + '></a>';
            case 'citation needed': //TODO citations
                return '<sup>Citation Needed</sup>';
            case 'efn':
            case 'refn': //TODO: handle separately
            case 'efn-ua': //TODO: handle separately
            case 'efn-lf': //TODO: handle separately
            case 'efn-ur': //TODO: handle separately
            case 'efn-lg': //TODO: handle separately
                return '<aside class=note>' + part.slice(1).join('|') + '</aside>';
            case 'lowercase': //TODO what is this?
                return '';
            case 'main':
                return '<div>' +
                    makeWikiLink(part[1],
                        leaf + 'See main article ' + part[1].toTitleCase()) +
                    '</div>';
            case 'keypress':
                return '<span class=keypress>' + part.slice(1).join('|') + '</span>';
            case 'not a typo': //TODO citations
                return part.slice(1).join('|') + '<sup>(sic)</sup>';
            case 'portal':
            case 'wikibooks':
                return makeWikiLink(part[1],
                    leaf + part[1] + ' ' + part[0]);    
            case 'r': // TODO short references?
                return '<sup>See ' + part[1] + '</sup>';
            case 'refimprove':
                return '';
            case 'reflist': // TODO reflist
                return '';
            case 'see also':
                return 'See also : ' + makeWikiLink(part[1], part[1]);
            case 'birth date and age':
            case 'start date and age':
                return part[1];
            default:
                if (/-stub$/i.test(wiki)) // ignore stubs
                    return '';
                if (/^cite/i.test(wiki)) // ignore stubs
                    return '<div class=citation>' +
                        wiki.split('\n|').map(function(row) {
                            row = row.split(/ *= */);
                            row[0] = row[0].toLowerCase().trim();
                            if (row.length != 2) return '';
                            return row[0] == 'title'? '<b>' + row[1] + '</b>':
                                row[0] == 'quote'? '<i>' + row[1] + '</i>':
                                row[0] == 'url'? '<a href=' + row[1] + '>' + row[1] + '</a>':
                                row[0] == 'accessdate'? '':
                                row[1];
                        }).join('<br>') + '</div>';
                if (/commands$/.test(wiki))
                    return makeWikiLink(wiki, leaf + wiki);
                if (/^infobox/i.test(wiki))
                    return '<aside><table class=infobox>' +
                        wiki.split(/\n *?\|/).map(function(row) {
                            row = row.split(/ *= */);
                            return row.length == 2?
                                '<tr><td>' + row[0].replace('_', ' ').toTitleCase() +
                                '</td><td>' + row[1] + '</td></tr>':
                                '';
                        }).join('') + '</table></aside>';
            }
            return todo(wiki);
        }
        function handleTables(all, wiki) {
            function handleRow(wiki) {
                wiki = wiki
                    .replace(/\|\|? +([^|]*) *\| *([^|]+)/mg, '<td $1>$2</td>')
                    .replace(/\|\|? +([^|]*)/mg, '<td>$1</td>')
                    .replace(/!!? +([^!]*)/mg, '<th>$1</th>')
                
                return '<tr>' + wiki + '</tr>';
            }
            //TODO nested tables e.g. ASCII#ASCII_control_code_chart
            var rows = wiki.split(/\|-/mg)
            var style = rows.shift();
            rows = rows.map(handleRow);
            return '<table ' + style + '>' + rows.join('') + '</table>';
        }
        function replace(all, wiki) {
            var handle = all[1] == '|'? handleTables: handleTemplates;
            replacements.push(handle(all, wiki));
            nReplacements++;
            return '\x1a' + String.fromCharCode(replacements.length - 1);
        }
        function expand(subst) {
            var i = subst.charCodeAt(1);
            nReplacements++;
            replacements[i] = replacements[i].replace(/\x1a[^]/mg, expand);
            return replacements[i];
        }
        
        wiki = wiki
            .replace(/<!--[^]*?-->/mg, '') // strip HTML comments
            //TODO: Subst
            //TODO: MSG, MSGNW, RAW
        // Templates can be nested
        // Loop through the string replacing any templates with no children
        // Process them and add them to the replacement list
        // Output ASCII SUB and the index as two characters
        // (e.g. \x1a\x01) for the second substitution to happen.
        // Once all substitutions have been made, replace the SUB codes
        // with the generated text.
        do {
            nReplacements = 0;
            wiki = wiki.replace(/\{[{|]([^{}]+?)[}|]}/mg, replace);
        } while (nReplacements);
        wiki = wiki.replace(/\x1a[^]/mg, expand);
        return wiki;
    }
    function extractStep(wiki) {
        function handleExtraction(all, tag, rest, body) {
            if (tag == 'nowiki' || tag == 'math') tag = 'span';
            extracts.push('<' + tag + rest + '>' + encodeHtml(body) + '</' + tag + '>');
            return '\x1a' + String.fromCharCode(extracts.length - 1);
        }
        return wiki.replace(/<(pre|source|nowiki|math)([^>]*)>([^]*?)<\/\1>/mg, handleExtraction)
    }
    function reintroductionStep(wiki) {
        function handleReintroduction(subst) {
            return extracts[subst.charCodeAt(1)];
        }
        return wiki.replace(/\x1a[^]/mg, handleReintroduction);
    }
    function internalStep(wiki) {
        function handleHeader(all, level, text) {
            return '<h' + level.length +
                ' id=' + text.trim().replace(/ /g, '_').replace(/<.*>/, '') + '-wiki>' +
                text + '</h' + level.length + '>';
        }
        function handleWikiLink(all, body) {
            var part = body.split('|');
            var type = part[0].toLowerCase();
            // http://stackoverflow.com/a/4498885
            //TODO: MD5 hash on filenames
//            if (/^file:/.test(type) || /^image:/.test(type))
//                return '<img src=' + linkBase + part[0] + '>';
            return part.length == 1? makeWikiLink(part[0], part[0]):
                part.length == 2? makeWikiLink(part[0], part[1]):
                makeWikiLink(part[0], part[0]);
        }
        function handleExternalLink(all, body) {
            var split = body.indexOf(' ');
            var url = split != -1? body.substring(0, split): body;
            var name = split != -1? body.substring(split + 1): url;
            return makeExternalLink(url, name);
        }
        return wiki
            .replace(/^(=+)(.+?)\1/mg, handleHeader)
            .replace(/'''''(.+?)'''''/mg, '<b><i>$1</i></b>')
            .replace(/'''(.+?)'''/mg, '<b>$1</b>')
            .replace(/''(.+?)''/mg, '<i>$1</i>')
            .replace(/\[\[\[(.+?)]]]/mg, todo) //TODO: unknown link
            .replace(/\[\[(.+?)]]/mg, handleWikiLink)
            .replace(/\[(.+)?]/mg, handleExternalLink)
            .replace(/__.+?__/mg, '') // ignore magic words
    }
    function blockStep(wiki) {
        function handleList(all) {
            return '<ul>' +
                all.split('\n').map(function(line) {
                    //TODO: handle nested lists
                    return '<li>' + line.replace(/[*#:;]+/, '');
                }) + '</ul>';
        }
        return wiki
            .replace(/^( .*)+/gm, '<pre>$1</pre>')
            .replace(/(?:^$)+/gm, '<p>')
            .replace(/^(?:[*#:;]+.*?$)+/gm, handleList)
    }
    wiki = preprocessStep(wiki);
    wiki = extractStep(wiki);
    var m;
    if (m = /^#REDIRECT *\[\[(.*?)]]/im.exec(wiki))
        return { redirect: m[1] };
    wiki = internalStep(wiki);
    wiki = blockStep(wiki);
    wiki = reintroductionStep(wiki);
    wiki = wiki
        .replace(/<\/a>([-a-zA-Z']+)/gm, '$1</a>') // Fix pluralisation, past tense, whathaveyou
        .replace(/<br>(\s*<br>)+/gm, '<br>')
        .replace(/<ref([^\/]*?)\/>/gm, '<ref$1></ref>')
    window.outHtml = wiki;
    return wiki;
}
function openPage(name) {
    window.wikiName = name;
    window.wikiTarget = '';
    name = name.replace(/^(.*?)#(.*?)$/, function(all, newName, anchor) {
        window.wikiTarget = anchor;
        return window.wikiName = newName;
    });
    document.querySelector('#main').querySelector('.title').innerHTML = name;
    document.querySelector('#viewOnWikipedia').href = linkBase + encodeURIComponent(wikiName);
    var dom = document.createElement('script');
    dom.type = 'text/javascript';
    dom.src = indexUrl + encodeURI(name);
    document.head.appendChild(dom);
}
function receivedWiki(json) {
    if (!json || Object.keys(json.query.pages)[0] == -1) {
        document.querySelector('#main > .copy').innerHTML = '<h2>Not Found</h2>';
        return;
    }
    var thisPage = json.query.pages[Object.keys(json.query.pages)[0]];
    var wiki = thisPage.revisions[0]['*'];
    var html = renderWiki(window.wikiName, wiki);
    window.wikiText = wiki;
    if (typeof(html) == 'string') {
        document.querySelector('#main > .title').innerText = thisPage.title;
        document.querySelector('#main > .copy').innerHTML = html;
        var dom;
        if (dom = document.getElementById((window.wikiTarget || '') + '-wiki'))
            dom.scrollIntoView();
        else
            window.scrollTo(0, 0);
    } else
        openPage(html.redirect + '#' + window.wikiTarget);
}
function handleShortcuts() {
    if (event.keyCode == 27 || event.ctrlKey && event.char == '\u000b') { // Escape, ^K
        toggleMenu('visible');
        var dom = document.querySelector('#search');
        dom.value = '';
        dom.focus();
        event.preventDefault();
        event.stopPropagation();
    }
}
function handleSearchEnter() {
    if (event.keyCode == 13) {
        openPage(this.value);
        toggleMenu('hidden');
        event.preventDefault();
        event.stopPropagation();
        document.focus();
    } else if (event.keyCode == 27) {
        this.value = '';
        toggleMenu('hidden');
        event.preventDefault();
        event.stopPropagation();
    }
}
function toggleMenu(force) {
    var dom = document.querySelector('#top');
    dom.style.visibility = force || (dom.style.visibility == 'hidden'? 'visible': 'hidden');
}
function toggleUnhandled() {
    event.target.childNodes[1].style.display =
        event.target.childNodes[1].style.display == 'block'?
            'none': 'block';
}
function copyWikitext() {
    window.clipboardData.setData('Text', window.wikiText);
}
function copyHtml() {
    window.clipboardData.setData('Text', window.outHtml);
}
function main() {
    if (!('toTitleCase' in String.prototype))
        String.prototype.toTitleCase = function() {
            return this.replace(/(\w)([^\s-]*)/gm,
                function(all,init,rest) { return init.toUpperCase() + rest });
        }
    document.querySelector('#search').onkeydown = handleSearchEnter;
    document.querySelector('#menuButton').addEventListener('click', function() { toggleMenu() });
    document.addEventListener('keydown', handleShortcuts);
    document.querySelector('#copyWikitext').addEventListener('click', function() { copyWikitext(); event.preventDefault(); toggleMenu(); });
    document.querySelector('#copyHtml').addEventListener('click', function() { copyHtml(); event.preventDefault(); toggleMenu(); });
    var query = {};
    window.location.search
        .substring(1)
        .replace(/\/$/, '') // IE will append / to http://host/?q=...
        .split('&')
        .map(decodeURIComponent)
        .map(function(i) {
            var x = i.split('=');
            query[x[0]] = x[1];
        });
    if (query.q) {
        toggleMenu('hidden');
        var name = decodeURIComponent(query.q);
        openPage(name + (window.location.hash || ''));
    } else {
        toggleMenu('visible');
        document.querySelector('#search').focus();
    }
}
document.addEventListener('DOMContentLoaded', main);