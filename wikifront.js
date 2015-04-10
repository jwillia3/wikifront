indexUrl = 'http://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&callback=receivedWiki&titles=';
linkBase = 'http://en.wikipedia.org/wiki/';
function makeWikiLink(url, name) {
    return '<a title="' + url + '" onclick=wikiClickHandler() ' +
        ' href=' + linkBase + encodeURIComponent(url) + '>' +
        name + '</a>';
}
function clearHistory() {
    document.querySelector('#history').innerHTML = '';
}
function clearQueue() {
    document.querySelector('#history').innerHTML = '';
}
function deleteListItem(e) {
    e.target.parentElement.style.backgroundColor = 'red';
    e.target.parentElement.parentElement.removeChild(e.target.parentElement);
}
function insertIntoList(name, parent) {
    var item = document.createElement('li');
    item.innerHTML = '<span class=itemDelete onclick=deleteListItem(event)>&#x2716;</span>' + makeWikiLink(name, name);
    parent.insertBefore(item, parent.firstChild);
}
function addToHistory(name) {
    insertIntoList(name, document.querySelector('#history'));
}
function addToQueue(name) {
    insertIntoList(name, document.querySelector('#queue'));
}
function renderWiki(name, wiki) {
    // See http://www.mediawiki.org/wiki/Markup_spec#Parser_outline
    function todo(all) {
        return '<span style=color:white;background:red> ... </span>';
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
            case 'citation needed': //TODO citations
                return '<sup>Citation Needed</sup>';
            case 'lowercase': //TODO what is this?
                return '';
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
            console.debug('Template:', part[0]);
            return todo(wiki); //TODO: handle templates
        }
        function replace(all, wiki) {
            replacements.push(handleTemplates(all, wiki));
            nReplacements++;
            return '\x1a' + String.fromCharCode(replacements.length - 1);
        }
        function expand(subst) {
            var i = subst.charCodeAt(1);
            nReplacements++;
            replacements[i] = replacements[i].replace(/\x1a./mg, expand);
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
            wiki = wiki.replace(/\{\{([^{}]+?)}}/mg, replace);
        } while (nReplacements);
        wiki = wiki.replace(/\x1a./mg, expand);
        return wiki;
    }
    function extractStep(wiki) {
        function handleExtraction(all, nowiki) {
            extracts.push(nowiki);
            return '\x1a' + String.fromCharCode(extracts.length - 1);
        }
        return wiki
            .replace(/<nowiki>([^]*?)<\/nowiki>/mg, handleExtraction)
            .replace(/<pre>([^]*?)<\/pre>/mg, handleExtraction)
            .replace(/<math>([^]*?)<\/math>/mg, handleExtraction)
    }
    function reintroductionStep(wiki) {
        function handleReintroduction(subst) {
            return extracts[subst.charCodeAt(1)];
        }
        return wiki.replace(/\x1a./mg, handleReintroduction);
    }
    function internalStep(wiki) {
        function handleHeader(all, level, text) {
            return '<h' + level.length +
                ' id=' + text.replace(/ /g, '_') + '-wiki>' +
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
            .replace(/^(=+)(.+?)=+/mg, handleHeader)
            .replace(/'''''(.+?)'''''/mg, '<b><i>$1<i></b>')
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
    return wiki;
}

function openPage(name) {
    if (window.wikiName)
        addToHistory(window.wikiName);
    openPageNoHistory(name);
}
function openPageNoHistory(name) {
    window.wikiName = name;
    window.wikiTarget = '';
    name = name.replace(/^(.*?)#(.*?)$/, function(all, newName, anchor) {
        window.wikiTarget = anchor;
        return window.wikiName = newName;
    });
    document.querySelector('#main').querySelector('.title').innerHTML = name;
    var dom = document.createElement('script');
    dom.type = 'text/javascript';
    dom.src = indexUrl + encodeURI(name);
    document.head.appendChild(dom);
}
function receivedWiki(json) {
    var wiki = json.query.pages[Object.keys(json.query.pages)[0]].revisions[0]['*'];
    var html = renderWiki(name, wiki);
    if (typeof(html) == 'string') {
        document.querySelector('#main > .copy').innerHTML = html;
        var dom;
        if (dom = document.getElementById((window.wikiTarget || '') + '-wiki'))
            dom.scrollIntoView();
        else
            window.scrollTo(0, 0);
    } else
        openPageNoHistory(html.redirect + '#' + window.wikiTarget);
}
function wikiClickHandler() {
    openPage(event.target.title);
    event.preventDefault();
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
function main() {
    if (!('toTitleCase' in String.prototype))
        String.prototype.toTitleCase = function() {
            return this.replace(/(\w)([^\s-]*)/gm,
                function(all,init,rest) { return init.toUpperCase() + rest });
        }
    document.querySelector('#search').onkeydown = handleSearchEnter;
    document.querySelector('#menuButton').addEventListener('click', function() { toggleMenu() });
    document.addEventListener('keydown', handleShortcuts);
    document.querySelector('#clearHistory').addEventListener('click', clearHistory);
    document.querySelector('#clearQueue').addEventListener('click', clearQueue);
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
        openPage(query.q + (window.location.hash || ''));
    } else {
        toggleMenu('visible');
        document.querySelector('#search').focus();
    }
}
document.addEventListener('DOMContentLoaded', main);