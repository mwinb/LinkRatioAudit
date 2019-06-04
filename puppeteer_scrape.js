
const puppeteer = require( 'puppeteer' );

const getButtonColors = async ( url ) => {
    const browser = await puppeteer.launch( { args: ['--no-sandbox'] } )
    const page = await browser.newPage();

    await page.goto( url );

    const getColors = await page.evaluate( ( ) => {
        const btn = document.querySelectorAll( 'a' );
        const btnList = [];
        
        function fullPath(el) {
            var names = [];
            while (el.parentNode)
            {
                if (el.id)
                {
                    names.unshift('#' + el.id);
                    break;
                }
                else
                {
                    if (el == el.ownerDocument.documentElement) names.unshift(el.tagName);
                    else
                    {
                    for (var c = 1, e = el; e.previousElementSibling; e = e.previousElementSibling, c++);
                    names.unshift(el.tagName + ":nth-child(" + c + ")");
                    }
                    el = el.parentNode;
                }
            }
            return names.join(" > ");
        };


        for( let i = 0; i < btn.length; i++ )
        {

            function ColorNode()  {
                this.background = "";
                this.text = "";
                this.fontWeight = "";
                this.fontSize = "";
                this.contrastRatio = 0;
                this.cssPath = "";
            }

            let transparent = "rgba(0, 0, 0, 0)";
            let newNode = new ColorNode();
            let currentNode = btn[i];

            newNode.text = JSON.parse( JSON.stringify( getComputedStyle( currentNode ).color ) );
            newNode.background = JSON.parse( JSON.stringify( getComputedStyle( currentNode ).backgroundColor ) );
            newNode.fontWeight = JSON.parse( JSON.stringify( getComputedStyle( currentNode ).fontWeight ) );
            newNode.fontSize = JSON.parse( JSON.stringify( getComputedStyle( currentNode ).fontSize ) );
            newNode.cssPath = fullPath(currentNode);
           

            
            while( ( newNode.background  ) === transparent )
            {
                currentNode = currentNode.parentElement;
                newNode.background = JSON.parse( JSON.stringify( getComputedStyle( currentNode ).backgroundColor ) );
            }
            
            
            if( newNode.text != transparent )
                btnList.push( newNode );
        }
        

        return btnList;
    });

    browser.close();
    return getColors;
}


( async function main() {
    //let url = 'https://www.amazon.com';
    //let url = 'https://www.foxnews.com';
    //let url = 'https://www.cnn.com';
    let url = 'https://cbsnews.com';
	//let url = 'https://oregonstate.edu';
    //let url = 'https://bestbuy.com';
    //let url = 'https://www.milestoneretirement.com'

    let beginGetData = Date.now();

    const pageButtons = await getButtonColors( url );

    let endGetData = Date.now();

    let totalPass = 0;
    let numTests = 0;

    let beginEvaluate = Date.now();
    for( let i = 0; i < pageButtons.length; i++ )
    {
        let currentLink = pageButtons[i];
        console.log( "      Link Index: " + i );
        console.log( "        css path: " + currentLink.cssPath );
        console.log( "Background Color: " + currentLink.background );
        console.log( "      Text Color: " + currentLink.text );
        console.log( "     Font Weight: " + currentLink.fontWeight );
        console.log( "       Font Size: " + currentLink.fontSize );

        currentLink.background = parseColors( currentLink.background );
        currentLink.text = parseColors( currentLink.text );
        currentLink.fontSize = parseFontSize( currentLink.fontSize );

        currentLink.contrastRatio = getContrast( currentLink );
        let testResult = passesTest( currentLink );

        totalPass += testResult;
        numTests++;
    
        console.log( "  Contrast Ratio: " + currentLink.contrastRatio );
        console.log( "     Passes test: " + testResult );
        console.log( "\n" );

    }

    let endEvaluate = Date.now();
    let percentage = totalPass/numTests;

    console.log( "Tested: " + url + " with AAA standard of 7.0 Contrast ratio" );
    console.log( "Number of tests passed: " + totalPass );
    console.log( "       Number of tests: " + numTests );
    console.log( "         Score Percent: " + percentage );
    console.log( "      Time to get data: " + printTime( endGetData, beginGetData ) );
    console.log( "      Time to evaluate: " + printTime( endEvaluate, beginEvaluate ) );
    

})();

function printTime(date1, date2)
{
    return ( ( date1 - date2 ) + " milliseconds" );
}


function parseColors( colorString ) {
    if ( colorString.includes( "rgba" ) )
        colorString = colorString.substring( 5 );
    else
        colorString = colorString.substring( 4 );

    colorString = colorString.slice( 0, -1 );
    let colorArray = colorString.split( ',' );
    return new RGB( parseFloat( colorArray[0] ) , parseFloat( colorArray[1] ), parseFloat( colorArray[2] ) );
}

function parseFontSize( fontSizeString )
{
    return parseFloat( fontSizeString.slice( -2 ) );
}


function RGB( r, g, b ) {
    this.r = r;
    this.g = g;
    this.b = b;
}

function getContrast( currentElement ) {

    let l1 = getLuminance(currentElement.background);
    let l2 = getLuminance(currentElement.text);

    let contrastRatio = (Math.max(l1, l2) + .05)/(Math.min(l1, l2) + .05);

    return contrastRatio;
}


function getLuminance( rgb ) {
    rgb = convertRGB(rgb);
    let luminance = (.2126 * rgb.r) + (.7152 * rgb.g) + (.0722 * rgb.b);
    return luminance;
}

function convertRGB( rgb ) {
    rgb.r = convertColor(rgb.r);
    rgb.g = convertColor(rgb.g);
    rgb.b = convertColor(rgb.b);
    return rgb;
}

function convertColor(color) {
    if ( color <= 10 )
    {
        color = color/3294;
    }
    else
    {
        color = Math.pow( ( color / 269 ) + .0513, 2.4);
    }
    return color;
}


//https://webdev.ink/2018/04/24/Text-Contrast-for-Web-Pages/#wdi-glossary-wcag
function passesTest( element ) {
    let contrastRatio = element.contrastRatio;
    let threshHold = 7.0;
    let relaxedThreshHold = 4.5;
    let fontBoldReq = 18.5;
    let bold = 700;
    let fontReq = 24;

    if ( contrastRatio >= threshHold || ( contrastRatio >= relaxedThreshHold && 
        ( ( element.fontSize >= fontBoldReq 
            && element.fontWeight >= bold ) || element.fontSize >= fontReq ) ) )
        return 1;

    return 0;
}

