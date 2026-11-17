export interface SeedLesson {
  courseSlug: 'html-fundamentals' | 'css-mastery';
  moduleTitle: string;
  orderIndex: number;
  title: string;
  summary: string;
  explanation: string;
  exampleCode: string;
  expectedOutput: string;
  exercisePrompt: string;
  starterHtml: string;
  starterCss: string;
  points: number;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export const SEED_LESSONS: SeedLesson[] = [
  // ================= HTML COURSE (11 Lessons) =================
  {
    courseSlug: 'html-fundamentals',
    moduleTitle: 'Getting Started with HTML',
    orderIndex: 1,
    title: '1. Introduction to HTML',
    summary: 'Learn what HTML is and how every website on the internet starts with simple building blocks.',
    explanation:
      'HTML stands for HyperText Markup Language. Think of a website like building a house: HTML is the bricks and walls that give the page its structure! Every word, picture, and button you see in a web browser starts as HTML.',
    exampleCode: `<h1>Hello, Family!</h1>\n<p>Welcome to our very first web page.</p>`,
    expectedOutput: 'A big bold title saying "Hello, Family!" followed by a normal paragraph underneath.',
    exercisePrompt: 'Change the heading to your own name and write one sentence about your favorite hobby.',
    starterHtml: `<h1>Hello, Family!</h1>\n<p>I am learning how to build websites today.</p>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; color: #0f172a; }`,
    points: 25,
    quiz: [
      {
        question: 'What does HTML stand for?',
        options: [
          'HyperText Markup Language',
          'High Tech Machine Learning',
          'Home Tool Maker Language',
          'Hyperlink Text Mode List',
        ],
        correctIndex: 0,
        explanation: 'HTML stands for HyperText Markup Language — the standard language for web pages.',
      },
      {
        question: 'If a website were a house, what job does HTML do?',
        options: ['It paints the walls', 'It builds the walls and structure', 'It turns on the electricity', 'It delivers the mail'],
        correctIndex: 1,
        explanation: 'HTML gives the page its structure, while CSS adds colors and style!',
      },
    ],
  },
  {
    courseSlug: 'html-fundamentals',
    moduleTitle: 'Getting Started with HTML',
    orderIndex: 2,
    title: '2. HTML Document Structure',
    summary: 'Discover the skeleton of every real HTML file: DOCTYPE, html, head, and body.',
    explanation:
      'Every full web page has two main rooms: the <head> (which holds secret info like the page title) and the <body> (everything visitors actually see on screen). At the very top, <!DOCTYPE html> tells the browser we are using modern HTML5.',
    exampleCode: `<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Space Page</title>\n  </head>\n  <body>\n    <h1>Blast Off!</h1>\n    <p>Everything inside body shows up here.</p>\n  </body>\n</html>`,
    expectedOutput: 'The browser shows "Blast Off!" and the paragraph inside the visible window.',
    exercisePrompt: 'Add a second paragraph inside the <body> tag describing a planet you want to visit.',
    starterHtml: `<!DOCTYPE html>\n<html>\n  <head>\n    <title>Space Explorer</title>\n  </head>\n  <body>\n    <h1>Blast Off!</h1>\n    <p>Everything inside the body appears on screen.</p>\n  </body>\n</html>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; background: #f8fafc; }`,
    points: 25,
    quiz: [
      {
        question: 'Where do you put content that visitors can see on the page?',
        options: ['Inside <head>', 'Inside <title>', 'Inside <body>', 'Above <!DOCTYPE html>'],
        correctIndex: 2,
        explanation: 'Everything visible on the page goes inside the <body>...</body> tags.',
      },
    ],
  },
  {
    courseSlug: 'html-fundamentals',
    moduleTitle: 'Getting Started with HTML',
    orderIndex: 3,
    title: '3. HTML Tags and Elements',
    summary: 'Understand opening tags, closing tags, attributes, and nested elements.',
    explanation:
      'Most HTML tags come in pairs like bookends: an opening tag <p> and a closing tag </p> with a forward slash. Together with the words inside, they form an HTML element! Some tags can also hold extra details called attributes, like id or title.',
    exampleCode: `<p title="Hover tip!">Hover your mouse over this sentence.</p>\n<p>Tags can be <strong>nested inside</strong> other tags!</p>`,
    expectedOutput: 'Two paragraphs where the words "nested inside" appear bold, and hovering shows a tooltip.',
    exercisePrompt: 'Wrap one important word inside <em>...</em> to make it italic and add a <strong> word.',
    starterHtml: `<p title="Nice job!">Hover over me to see a secret tip.</p>\n<p>Learning HTML is <strong>super</strong> fun!</p>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; line-height: 1.6; }`,
    points: 25,
    quiz: [
      {
        question: 'Which symbol marks a closing HTML tag?',
        options: ['#', '/', '*', '@'],
        correctIndex: 1,
        explanation: 'Closing tags always start with a forward slash, like </p> or </h1>.',
      },
    ],
  },
  {
    courseSlug: 'html-fundamentals',
    moduleTitle: 'Text, Media & Links',
    orderIndex: 4,
    title: '4. Headings and Paragraphs',
    summary: 'Organize stories and articles using h1 through h6 headings and p paragraphs.',
    explanation:
      'HTML gives us six sizes of headings from <h1> (the biggest main title) down to <h6> (tiny subheadings). Paragraphs always go inside <p> tags so the browser automatically adds neat spacing between blocks of text.',
    exampleCode: `<h1>My Weekend Adventure</h1>\n<h2>Saturday Morning</h2>\n<p>We rode bikes around the park.</p>\n<h3>Snack Break</h3>\n<p>Apples and cold water tasted amazing!</p>`,
    expectedOutput: 'A large main heading, medium subheading, smaller sub-subheading, and spaced paragraphs.',
    exercisePrompt: 'Write a mini story about your dream vacation using <h1>, <h2>, and two <p> paragraphs.',
    starterHtml: `<h1>My Dream Trip</h1>\n<h2>Day 1: Arrival</h2>\n<p>Write your opening paragraph here.</p>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; color: #1e293b; }`,
    points: 25,
    quiz: [
      {
        question: 'Which heading tag creates the largest, most important page title?',
        options: ['<h6>', '<h3>', '<h1>', '<head>'],
        correctIndex: 2,
        explanation: '<h1> is the largest and primary heading level.',
      },
    ],
  },
  {
    courseSlug: 'html-fundamentals',
    moduleTitle: 'Text, Media & Links',
    orderIndex: 5,
    title: '5. Links',
    summary: 'Connect pages together with anchor tags (<a>) and href attributes.',
    explanation:
      'Links are what make the web a "web"! We use the anchor tag <a> with an href attribute (Hypertext Reference) to tell the browser where to go when clicked. You can link to another section on the same page using #id.',
    exampleCode: `<a href="#bottom">Jump to Bottom Fact</a>\n<p style="margin-top: 120px;" id="bottom">Fun fact: The first website went live in 1991!</p>`,
    expectedOutput: 'A clickable blue underlined link that jumps smoothly down to the fun fact.',
    exercisePrompt: 'Create a second link that jumps to an element with id="top" or an external safe link with target="_blank".',
    starterHtml: `<h2 id="top">Link Explorer</h2>\n<p><a href="#secret">Jump to Secret Fact</a></p>\n<div style="height: 160px"></div>\n<p id="secret">You found the secret HTML anchor! <a href="#top">Back to top</a></p>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; } a { color: #2563eb; font-weight: 600; }`,
    points: 30,
    quiz: [
      {
        question: 'Which attribute inside <a> sets the destination address?',
        options: ['src', 'href', 'link', 'alt'],
        correctIndex: 1,
        explanation: 'href stands for Hypertext Reference and stores the link destination.',
      },
    ],
  },
  {
    courseSlug: 'html-fundamentals',
    moduleTitle: 'Text, Media & Links',
    orderIndex: 6,
    title: '6. Images',
    summary: 'Display graphics safely with <img>, src, width, and alt descriptions.',
    explanation:
      'The <img> tag does not need a closing tag! It uses src to find the picture and alt to describe the picture in words (for screen readers and in case the image cannot load). We can also use clean inline SVG pictures right inside HTML.',
    exampleCode: `<figure>\n  <svg width="160" height="100" viewBox="0 0 160 100">\n    <rect width="160" height="100" rx="12" fill="#dbeafe"/>\n    <circle cx="80" cy="50" r="28" fill="#2563eb"/>\n  </svg>\n  <figcaption>A crisp blue badge graphic</figcaption>\n</figure>`,
    expectedOutput: 'A rounded light-blue card containing a bright blue circle and a caption below it.',
    exercisePrompt: 'Change the circle color (fill) to #16a34a (green) and update the figcaption text.',
    starterHtml: `<figure>\n  <svg width="180" height="110" viewBox="0 0 180 110">\n    <rect width="180" height="110" rx="14" fill="#e2e8f0"/>\n    <circle cx="90" cy="55" r="30" fill="#2563eb"/>\n  </svg>\n  <figcaption>My first web graphic!</figcaption>\n</figure>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; } figcaption { margin-top: 8px; color: #475569; font-size: 14px; }`,
    points: 30,
    quiz: [
      {
        question: 'Why should every <img> tag include an alt attribute?',
        options: [
          'To make the image spin',
          'To describe the image for accessibility and if it fails to load',
          'To change the font size',
          'To add a border automatically',
        ],
        correctIndex: 1,
        explanation: 'The alt text helps visually impaired users and displays when an image cannot load.',
      },
    ],
  },
  {
    courseSlug: 'html-fundamentals',
    moduleTitle: 'Organizing Data & Input',
    orderIndex: 7,
    title: '7. Lists',
    summary: 'Build bulleted lists (<ul>) and numbered step lists (<ol>) with <li> items.',
    explanation:
      'Whenever you have a shopping list, top-5 games, or recipe steps, lists make it clean! Use <ul> (unordered list) for bullet points and <ol> (ordered list) for 1, 2, 3 numbers. Each item inside goes in <li>...</li>.',
    exampleCode: `<h3>My Favorite Snacks</h3>\n<ul>\n  <li>Strawberries</li>\n  <li>Popcorn</li>\n</ul>\n<h3>Morning Routine</h3>\n<ol>\n  <li>Brush teeth</li>\n  <li>Eat breakfast</li>\n</ol>`,
    expectedOutput: 'One bulleted list of snacks and one numbered list of morning steps.',
    exercisePrompt: 'Add two more items to each list so both lists have 4 items.',
    starterHtml: `<h3>Top Coding Goals</h3>\n<ol>\n  <li>Learn HTML tags</li>\n  <li>Style with CSS</li>\n</ol>\n<h3>Favorite Fruits</h3>\n<ul>\n  <li>Mango</li>\n  <li>Blueberry</li>\n</ul>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; line-height: 1.7; }`,
    points: 25,
    quiz: [
      {
        question: 'Which tag creates a numbered list (1, 2, 3)?',
        options: ['<ul>', '<ol>', '<li>', '<list>'],
        correctIndex: 1,
        explanation: '<ol> stands for Ordered List and numbers each <li> automatically.',
      },
    ],
  },
  {
    courseSlug: 'html-fundamentals',
    moduleTitle: 'Organizing Data & Input',
    orderIndex: 8,
    title: '8. Tables',
    summary: 'Arrange scores and schedules in neat rows and columns with <table>, <tr>, <th>, and <td>.',
    explanation:
      'Tables are awesome for game scoreboards or school timetables! A <table> holds rows (<tr>). Header cells use <th> (table header) and regular data cells use <td> (table data).',
    exampleCode: `<table>\n  <tr><th>Player</th><th>Points</th></tr>\n  <tr><td>Leo</td><td>120</td></tr>\n  <tr><td>Maya</td><td>135</td></tr>\n</table>`,
    expectedOutput: 'A clean 2-column scoreboard table with Player and Points headers.',
    exercisePrompt: 'Add a third row for Dad with 95 points!',
    starterHtml: `<h3>Family Race Scoreboard</h3>\n<table>\n  <tr><th>Driver</th><th>Best Lap</th></tr>\n  <tr><td>Leo</td><td>42.1s</td></tr>\n  <tr><td>Maya</td><td>41.8s</td></tr>\n</table>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; } th { background: #f1f5f9; }`,
    points: 30,
    quiz: [
      {
        question: 'What does <tr> stand for inside an HTML table?',
        options: ['Table Rule', 'Table Row', 'Text Right', 'Title Range'],
        correctIndex: 1,
        explanation: '<tr> creates a Table Row containing <th> or <td> cells.',
      },
    ],
  },
  {
    courseSlug: 'html-fundamentals',
    moduleTitle: 'Organizing Data & Input',
    orderIndex: 9,
    title: '9. Forms',
    summary: 'Collect user input with <form>, <label>, <input>, and <button>.',
    explanation:
      'Forms let visitors type their name, pick a color, or send a message! Always pair every <input> with a <label> so everyone knows what to type into the box.',
    exampleCode: `<form onsubmit="event.preventDefault(); alert('Welcome!');">\n  <label>Your Name:</label>\n  <input type="text" placeholder="Type name" required />\n  <button type="submit">Join Club</button>\n</form>`,
    expectedOutput: 'A text input box with a clear label and a clickable "Join Club" button.',
    exercisePrompt: 'Add a favorite color input (<input type="color">) above the submit button.',
    starterHtml: `<h3>Coding Club Sign-Up</h3>\n<form onsubmit="event.preventDefault(); document.getElementById('msg').textContent = 'Signed up!';">\n  <label for="kidname">Nickname:</label><br/>\n  <input id="kidname" type="text" placeholder="Enter nickname" required /><br/><br/>\n  <button type="submit">Save Entry</button>\n  <p id="msg"></p>\n</form>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; } input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; } button { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }`,
    points: 35,
    quiz: [
      {
        question: 'Which HTML element describes what an input box is asking for?',
        options: ['<caption>', '<label>', '<name>', '<hint>'],
        correctIndex: 1,
        explanation: '<label> gives an accessible name to an <input> field.',
      },
    ],
  },
  {
    courseSlug: 'html-fundamentals',
    moduleTitle: 'Semantic Structure & Mini Project',
    orderIndex: 10,
    title: '10. Semantic HTML',
    summary: 'Use meaningful layout tags like <header>, <nav>, <main>, <article>, and <footer>.',
    explanation:
      'Instead of wrapping everything in plain <div> boxes, Semantic HTML uses meaningful names that explain what each section does! <header> is the top banner, <nav> holds links, <main> is the star of the page, and <footer> sits at the bottom.',
    exampleCode: `<header><h1>Kid News</h1></header>\n<main>\n  <article>\n    <h2>Robot Built from Cardboard!</h2>\n    <p>Two siblings built an awesome robot.</p>\n  </article>\n</main>\n<footer>Made by Family Connect</footer>`,
    expectedOutput: 'A structured news page with header, main article, and footer sections.',
    exercisePrompt: 'Add a <nav> section inside <header> with two links: Home and Stories.',
    starterHtml: `<header>\n  <h1>Family Gazette</h1>\n</header>\n<main>\n  <article>\n    <h2>Sunday Pancake Record</h2>\n    <p>We flipped 14 blueberry pancakes without dropping one!</p>\n  </article>\n</main>\n<footer>Copyright 2026 Family Gazette</footer>`,
    starterCss: `body { font-family: sans-serif; padding: 16px; margin: 0; } header { background: #1e293b; color: white; padding: 14px; border-radius: 8px; } main { margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; } footer { font-size: 12px; color: #64748b; }`,
    points: 35,
    quiz: [
      {
        question: 'Which semantic tag wraps the main unique content of a page?',
        options: ['<center>', '<main>', '<div-main>', '<footer>'],
        correctIndex: 1,
        explanation: '<main> holds the central content of the document.',
      },
    ],
  },
  {
    courseSlug: 'html-fundamentals',
    moduleTitle: 'Semantic Structure & Mini Project',
    orderIndex: 11,
    title: '11. Mini Projects: Animal Fact Card',
    summary: 'Combine headings, lists, tables, and semantic HTML to build a complete fact sheet.',
    explanation:
      'Time to put all 10 HTML superpowers together! Build an interactive Animal Fact Card using <header>, <main>, a bulleted list of habitats, and a quick-stats <table>.',
    exampleCode: `<main>\n  <h1>Giant Panda</h1>\n  <ul><li>Eats bamboo</li><li>Lives in mountains</li></ul>\n</main>`,
    expectedOutput: 'A complete, well-organized Animal Fact Card page.',
    exercisePrompt: 'Customize the animal to your favorite creature (like Cheetah or Dolphin) and complete the facts table!',
    starterHtml: `<header>\n  <h1>Wildlife Explorer: Sea Otter</h1>\n</header>\n<main>\n  <h2>Fun Facts</h2>\n  <ul>\n    <li>Holds hands while sleeping</li>\n    <li>Uses rocks to open shells</li>\n  </ul>\n  <h2>Quick Stats</h2>\n  <table>\n    <tr><th>Feature</th><th>Detail</th></tr>\n    <tr><td>Habitat</td><td>Pacific Ocean</td></tr>\n    <tr><td>Top Speed</td><td>9 km/h</td></tr>\n  </table>\n</main>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; background: #f8fafc; color: #0f172a; } header { background: #0f172a; color: white; padding: 16px; border-radius: 10px; } table { width: 100%; border-collapse: collapse; margin-top: 8px; } th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }`,
    points: 50,
    quiz: [
      {
        question: 'Which combination of tags helps organize a fact card cleanly?',
        options: [
          'Only <br> tags everywhere',
          'Semantic <header> and <main> with <ul> and <table>',
          'Putting everything inside <head>',
          'Using <h6> for the biggest title',
        ],
        correctIndex: 1,
        explanation: 'Combining semantic sections with lists and tables creates clear, readable pages!',
      },
    ],
  },

  // ================= CSS COURSE (14 Lessons) =================
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Styling Foundations',
    orderIndex: 1,
    title: '1. Introduction to CSS',
    summary: 'See how CSS paints, styles, and brings HTML structure to life.',
    explanation:
      'CSS stands for Cascading Style Sheets. If HTML is the skeleton and walls of your house, CSS is the paint, curtains, carpets, and lighting! With just a few CSS rules, plain black-and-white HTML transforms into something awesome.',
    exampleCode: `h1 {\n  color: #2563eb;\n  font-size: 32px;\n}`,
    expectedOutput: 'The heading turns bright blue and grows larger.',
    exercisePrompt: 'Change the h1 color to #059669 and give the paragraph a nice dark slate color.',
    starterHtml: `<h1>CSS Magic!</h1>\n<p>Watch how styles change plain HTML.</p>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; }\nh1 { color: #2563eb; }\np { color: #475569; font-size: 18px; }`,
    points: 25,
    quiz: [
      {
        question: 'What does CSS do on a web page?',
        options: [
          'Stores database passwords',
          'Controls colors, fonts, spacing, and layout',
          'Replaces the web browser',
          'Deletes HTML tags',
        ],
        correctIndex: 1,
        explanation: 'CSS controls the visual presentation — colors, typography, spacing, and layout.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Styling Foundations',
    orderIndex: 2,
    title: '2. Inline, Internal and External CSS',
    summary: 'Learn the three ways to add CSS to an HTML document and when to use each.',
    explanation:
      'There are 3 ways to apply CSS: 1) Inline CSS right inside a tag using style="...", 2) Internal CSS inside a <style> tag in the <head>, and 3) External CSS in a separate .css file (the cleanest way for real multi-page websites!).',
    exampleCode: `<!-- Inline -->\n<p style="color: crimson;">Inline red text</p>\n<!-- External / CSS panel -->\n<p class="neat">Styled cleanly in CSS!</p>`,
    expectedOutput: 'One red paragraph styled inline and one clean styled paragraph.',
    exercisePrompt: 'Style the .neat class in the CSS box with a background color and padding.',
    starterHtml: `<p style="color: #dc2626;">I am inline styled!</p>\n<p class="neat">I am styled cleanly with a CSS class!</p>`,
    starterCss: `.neat {\n  color: #1e293b;\n  background: #e0f2fe;\n  padding: 12px;\n  border-radius: 8px;\n}`,
    points: 25,
    quiz: [
      {
        question: 'Which CSS method is cleanest for styling a large multi-page website?',
        options: ['Inline style on every tag', 'External .css stylesheet', 'Writing CSS inside <p> text', 'Using no CSS'],
        correctIndex: 1,
        explanation: 'External stylesheets keep your HTML tidy and let multiple pages share one design.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Styling Foundations',
    orderIndex: 3,
    title: '3. CSS Selectors',
    summary: 'Target exact HTML elements using tag, .class, and #id selectors.',
    explanation:
      'Selectors tell CSS WHICH elements to paint! Tag selectors (p) style every paragraph. Class selectors (.highlight) style any element with class="highlight". ID selectors (#hero) target one unique element with id="hero".',
    exampleCode: `p { color: #334155; }\n.highlight { background: #fef08a; padding: 4px; }\n#hero { font-size: 28px; color: #2563eb; }`,
    expectedOutput: 'The hero title turns blue, and the highlighted word gets a yellow marker background.',
    exercisePrompt: 'Create a new class called .badge in CSS and apply it to the second paragraph.',
    starterHtml: `<h1 id="hero">Selector Detective</h1>\n<p>Normal text stays neat.</p>\n<p class="highlight">Classes can be reused anywhere!</p>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; }\n#hero { color: #2563eb; }\n.highlight { background: #fef08a; padding: 6px 10px; border-radius: 6px; display: inline-block; }`,
    points: 30,
    quiz: [
      {
        question: 'Which symbol starts a CSS class selector?',
        options: ['# (hash)', '. (dot)', '@ (at)', '$ (dollar)'],
        correctIndex: 1,
        explanation: 'Class selectors always start with a dot, like .highlight.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Colors, Fonts & Box Model',
    orderIndex: 4,
    title: '4. Colors',
    summary: 'Paint with named colors, HEX codes (#2563eb), and RGB/RGBA values.',
    explanation:
      'Browsers understand over 140 color names like "tomato" or "navy", plus HEX codes like #2563eb (Red, Green, Blue mixed in hex!) and rgba(37, 99, 235, 0.2) when you want see-through transparency.',
    exampleCode: `.card {\n  color: #0f172a;\n  background-color: rgba(37, 99, 235, 0.12);\n}`,
    expectedOutput: 'Dark crisp text over a soft translucent blue card.',
    exercisePrompt: 'Experiment with HEX codes to create a sunset orange card with readable dark text.',
    starterHtml: `<div class="swatch">Color Mixer Card</div>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; }\n.swatch {\n  background-color: #dbeafe;\n  color: #1e3a8a;\n  padding: 20px;\n  border-radius: 10px;\n  font-weight: 700;\n}`,
    points: 25,
    quiz: [
      {
        question: 'What does the "a" in rgba(0, 0, 0, 0.5) control?',
        options: ['Animation speed', 'Alpha (transparency)', 'Alignment', 'Angle'],
        correctIndex: 1,
        explanation: 'Alpha controls opacity from 0 (invisible) to 1 (solid).',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Colors, Fonts & Box Model',
    orderIndex: 5,
    title: '5. Backgrounds',
    summary: 'Style backgrounds with solid colors, smooth linear gradients, and subtle patterns.',
    explanation:
      'Every box can have a background! Beyond flat colors, linear-gradient() blends two or more colors smoothly at any angle you pick.',
    exampleCode: `.banner {\n  background: linear-gradient(135deg, #0ea5e9, #2563eb);\n  color: white;\n  padding: 24px;\n}`,
    expectedOutput: 'A vibrant sky-to-cobalt gradient banner with crisp white text.',
    exercisePrompt: 'Change the gradient colors to a forest green blend (#10b981 to #047857).',
    starterHtml: `<div class="banner">\n  <h2>Gradient Horizon</h2>\n  <p>Smooth CSS backgrounds look awesome!</p>\n</div>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; }\n.banner {\n  background: linear-gradient(135deg, #0284c7, #1d4ed8);\n  color: white;\n  padding: 24px;\n  border-radius: 12px;\n}`,
    points: 30,
    quiz: [
      {
        question: 'Which CSS function blends two colors smoothly across an element?',
        options: ['color-mix-box()', 'linear-gradient()', 'paint-blend()', 'fade-bg()'],
        correctIndex: 1,
        explanation: 'linear-gradient() creates smooth multi-color background transitions.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Colors, Fonts & Box Model',
    orderIndex: 6,
    title: '6. Fonts',
    summary: 'Control font-family, font-size, font-weight, and line-height for super readable text.',
    explanation:
      'Good typography makes websites easy and fun to read! font-family picks the letter style, font-weight makes letters light (400) or bold (700), and line-height adds breathing room between lines.',
    exampleCode: `h1 { font-family: Georgia, serif; font-size: 30px; }\np { font-family: sans-serif; line-height: 1.7; }`,
    expectedOutput: 'A classic serif title paired with airy, easy-to-read body text.',
    exercisePrompt: 'Increase the paragraph line-height to 1.8 and change font-size to 17px.',
    starterHtml: `<h1>Storybook Typography</h1>\n<p>Great spacing between lines makes long stories effortless to read on laptops and tablets.</p>`,
    starterCss: `body { padding: 20px; color: #1e293b; }\nh1 { font-family: Georgia, serif; margin-bottom: 8px; }\np { font-family: system-ui, sans-serif; font-size: 16px; line-height: 1.6; }`,
    points: 25,
    quiz: [
      {
        question: 'Which property adds vertical breathing room between lines of text?',
        options: ['letter-gap', 'line-height', 'word-space', 'text-margin'],
        correctIndex: 1,
        explanation: 'line-height sets the vertical distance between lines of text.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Colors, Fonts & Box Model',
    orderIndex: 7,
    title: '7. Margins and Padding',
    summary: 'Master inner space (padding) vs. outer space (margin) around elements.',
    explanation:
      'Padding is the cushion INSIDE a box between the border and the words. Margin is the personal space OUTSIDE the box pushing neighbors away! Remember: Padding = Inside, Margin = Outside.',
    exampleCode: `.box {\n  padding: 20px;\n  margin-bottom: 16px;\n}`,
    expectedOutput: 'Two stacked boxes with roomy space inside each box and neat separation between them.',
    exercisePrompt: 'Double the padding on .box-two to 32px and watch how much larger its inner cushion becomes.',
    starterHtml: `<div class="box box-one">Box 1 (16px padding)</div>\n<div class="box box-two">Box 2 (Change my padding!)</div>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; }\n.box { background: #e2e8f0; border: 1px solid #94a3b8; border-radius: 8px; margin-bottom: 16px; }\n.box-one { padding: 16px; }\n.box-two { padding: 12px; }`,
    points: 30,
    quiz: [
      {
        question: 'Which property creates space INSIDE an element, between its text and its border?',
        options: ['margin', 'padding', 'outside-gap', 'border-space'],
        correctIndex: 1,
        explanation: 'Padding adds cushion inside the border; margin adds space outside the border.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Colors, Fonts & Box Model',
    orderIndex: 8,
    title: '8. Borders',
    summary: 'Draw crisp frames and rounded corners using border and border-radius.',
    explanation:
      'Borders wrap around an element! You choose the thickness (2px), style (solid, dashed, dotted), and color (#2563eb). Add border-radius to turn sharp corners into friendly rounded corners or circles!',
    exampleCode: `.pill-box {\n  border: 2px dashed #0284c7;\n  border-radius: 14px;\n  padding: 16px;\n}`,
    expectedOutput: 'A clean dashed blue rounded card.',
    exercisePrompt: 'Change the border style from dashed to solid and set border-radius to 20px.',
    starterHtml: `<div class="frame">Border Explorer Card</div>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; }\n.frame {\n  border: 2px dashed #2563eb;\n  border-radius: 10px;\n  padding: 18px;\n  font-weight: 600;\n}`,
    points: 25,
    quiz: [
      {
        question: 'Which CSS property rounds the sharp corners of a box?',
        options: ['corner-curve', 'border-radius', 'box-round', 'edge-smooth'],
        correctIndex: 1,
        explanation: 'border-radius curves all four corners of an element.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Colors, Fonts & Box Model',
    orderIndex: 9,
    title: '9. The CSS Box Model',
    summary: 'See how Content + Padding + Border + Margin combine with box-sizing: border-box.',
    explanation:
      'Every single HTML element is actually a rectangle made of 4 layers from inside out: Content -> Padding -> Border -> Margin. Adding box-sizing: border-box makes width easier because padding stays inside your chosen width!',
    exampleCode: `* { box-sizing: border-box; }\n.panel { width: 260px; padding: 20px; border: 4px solid #334155; }`,
    expectedOutput: 'A panel that stays exactly 260px wide total instead of overflowing.',
    exercisePrompt: 'Add margin: 20px auto; to center the .panel horizontally on the page.',
    starterHtml: `<div class="panel">I stay exactly 260px wide because of border-box!</div>`,
    starterCss: `* { box-sizing: border-box; }\nbody { font-family: sans-serif; padding: 20px; }\n.panel {\n  width: 260px;\n  padding: 20px;\n  border: 4px solid #2563eb;\n  background: #eff6ff;\n  border-radius: 10px;\n}`,
    points: 35,
    quiz: [
      {
        question: 'In the CSS Box Model, what are the 4 layers from inside out?',
        options: [
          'Margin, Border, Padding, Content',
          'Content, Padding, Border, Margin',
          'Border, Content, Margin, Padding',
          'Padding, Content, Margin, Border',
        ],
        correctIndex: 1,
        explanation: 'From inside out: Content -> Padding -> Border -> Margin.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Modern Layout & Motion',
    orderIndex: 10,
    title: '10. Flexbox',
    summary: 'Align cards side-by-side effortlessly with display: flex, gap, and justify-content.',
    explanation:
      'Flexbox is a superpower for lining items up in a row or column! Put display: flex on a parent container, and all its children line up horizontally. Use gap to space them out evenly.',
    exampleCode: `.row {\n  display: flex;\n  gap: 12px;\n  justify-content: space-between;\n}`,
    expectedOutput: 'Three colorful cards lined up neatly side by side in a row.',
    exercisePrompt: 'Change flex-direction: column; or try justify-content: center; to see how Flexbox moves items.',
    starterHtml: `<div class="row">\n  <div class="card">HTML</div>\n  <div class="card">CSS</div>\n  <div class="card">JS</div>\n</div>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; }\n.row {\n  display: flex;\n  gap: 12px;\n}\n.card {\n  flex: 1;\n  background: #0f172a;\n  color: white;\n  padding: 16px;\n  border-radius: 8px;\n  text-align: center;\n  font-weight: 600;\n}`,
    points: 40,
    quiz: [
      {
        question: 'Which CSS property turns a container into a Flexbox row?',
        options: ['layout: flex;', 'display: flex;', 'align: row;', 'flex: enable;'],
        correctIndex: 1,
        explanation: 'display: flex activates Flexbox on the container.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Modern Layout & Motion',
    orderIndex: 11,
    title: '11. CSS Grid',
    summary: 'Create 2D photo galleries and dashboard grids with display: grid and grid-template-columns.',
    explanation:
      'While Flexbox shines in one line (a row or column), CSS Grid lets you design full two-dimensional rows AND columns at the same time! repeat(2, 1fr) makes two equal columns.',
    exampleCode: `.grid {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  gap: 12px;\n}`,
    expectedOutput: 'A clean 2x2 grid of 4 equal tiles.',
    exercisePrompt: 'Change repeat(2, 1fr) to repeat(3, 1fr) and watch the grid rearrange into 3 columns.',
    starterHtml: `<div class="grid">\n  <div class="tile">1</div>\n  <div class="tile">2</div>\n  <div class="tile">3</div>\n  <div class="tile">4</div>\n</div>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; }\n.grid {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  gap: 12px;\n}\n.tile {\n  background: #2563eb;\n  color: white;\n  padding: 20px;\n  border-radius: 8px;\n  text-align: center;\n  font-weight: 700;\n}`,
    points: 40,
    quiz: [
      {
        question: 'What does 1fr mean in CSS Grid?',
        options: ['1 frame rate', '1 fraction of available space', '1 fixed row', '1 font ratio'],
        correctIndex: 1,
        explanation: 'fr stands for fractional unit — dividing remaining space evenly.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Modern Layout & Motion',
    orderIndex: 12,
    title: '12. Responsive Design',
    summary: 'Adapt layouts for phones, tablets, and desktops with @media queries and flexible widths.',
    explanation:
      'People visit websites on wide laptops AND small phones! Responsive design uses flexible grids like auto-fit + minmax() or @media (max-width: 600px) so layouts automatically stack cleanly on small screens.',
    exampleCode: `.cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));\n  gap: 12px;\n}`,
    expectedOutput: 'Cards automatically wrap onto new rows whenever the preview window gets narrower.',
    exercisePrompt: 'Add a @media (max-width: 500px) rule that changes body background to #f0fdf4 on narrow screens.',
    starterHtml: `<div class="cards">\n  <div class="box">Mobile Friendly</div>\n  <div class="box">Tablet Ready</div>\n  <div class="box">Desktop Crisp</div>\n</div>`,
    starterCss: `body { font-family: sans-serif; padding: 16px; }\n.cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));\n  gap: 12px;\n}\n.box { background: #e2e8f0; padding: 18px; border-radius: 8px; text-align: center; font-weight: 600; }`,
    points: 40,
    quiz: [
      {
        question: 'Which CSS rule applies styles only when the screen is narrower than 600px?',
        options: [
          '@screen (small)',
          '@media (max-width: 600px)',
          '@mobile-only',
          '@responsive < 600px',
        ],
        correctIndex: 1,
        explanation: '@media (max-width: 600px) applies styles on viewports 600px wide or smaller.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Modern Layout & Motion',
    orderIndex: 13,
    title: '13. CSS Animations',
    summary: 'Bring buttons and badges to life with transitions and @keyframes.',
    explanation:
      'With transition, hovering over a button smoothly lifts it up! And with @keyframes, you can make smooth repeating animations like a gently bouncing badge.',
    exampleCode: `.btn {\n  transition: transform 0.2s ease;\n}\n.btn:hover {\n  transform: translateY(-3px);\n}`,
    expectedOutput: 'A button that glides smoothly upward when your mouse hovers over it.',
    exercisePrompt: 'Add a hover background color change on .btn so it shifts from #2563eb to #1d4ed8.',
    starterHtml: `<button class="btn">Hover Over Me!</button>`,
    starterCss: `body { font-family: sans-serif; padding: 30px; }\n.btn {\n  background: #2563eb;\n  color: white;\n  border: none;\n  padding: 12px 24px;\n  border-radius: 10px;\n  font-size: 16px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: transform 0.2s ease, background 0.2s ease;\n}\n.btn:hover {\n  transform: translateY(-3px);\n}`,
    points: 40,
    quiz: [
      {
        question: 'Which CSS property makes a hover change happen smoothly over 0.2 seconds?',
        options: ['smooth', 'transition', 'delay-hover', 'animate-hover'],
        correctIndex: 1,
        explanation: 'transition smoothly animates property changes like transform and background.',
      },
    ],
  },
  {
    courseSlug: 'css-mastery',
    moduleTitle: 'Modern Layout & Motion',
    orderIndex: 14,
    title: '14. Complete Website Development',
    summary: 'Put HTML + CSS Flexbox, Grid, Typography, and Transitions together in one polished mini-site.',
    explanation:
      'Congratulations on reaching the final CSS lesson! Here you combine semantic HTML (<header>, <main>, <footer>) with Flexbox navigation, a Grid feature section, crisp typography, and smooth hover transitions.',
    exampleCode: `<header class="nav">...</header>\n<main class="grid">...</main>`,
    expectedOutput: 'A complete mini landing page with navigation bar and a 2-column feature grid.',
    exercisePrompt: 'Customize the brand name, colors, and feature cards to make this mini website yours!',
    starterHtml: `<header class="topbar">\n  <strong>Solar Kids Club</strong>\n  <nav><a href="#about">About</a> <a href="#join">Join</a></nav>\n</header>\n<main class="features">\n  <div class="card"><h3>Build Rockets</h3><p>Design cardboard & water rockets every Saturday.</p></div>\n  <div class="card"><h3>Code Sites</h3><p>Share project stories online with family.</p></div>\n</main>`,
    starterCss: `* { box-sizing: border-box; }\nbody { font-family: sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }\n.topbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: white; border-bottom: 1px solid #e2e8f0; }\nnav a { color: #2563eb; text-decoration: none; margin-left: 14px; font-weight: 600; }\n.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; padding: 20px; }\n.card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; transition: transform 0.2s ease; }\n.card:hover { transform: translateY(-2px); }`,
    points: 60,
    quiz: [
      {
        question: 'Which workflow gives you the cleanest, easiest-to-maintain website?',
        options: [
          'Semantic HTML structure + clean CSS Flexbox/Grid + consistent colors',
          'Putting all text in one giant <div> with no CSS',
          'Using 50 different fonts on one page',
          'Skipping <header> and <main>',
        ],
        correctIndex: 0,
        explanation: 'Semantic HTML paired with clean Flexbox/Grid layout and consistent styling makes professional websites!',
      },
    ],
  },
];

export interface SeedGuidedTemplate {
  slug: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  objectives: string[];
  instructions: string;
  starterHtml: string;
  starterCss: string;
  starterJs: string;
}

export const GUIDED_PROJECT_TEMPLATES: SeedGuidedTemplate[] = [
  {
    slug: 'personal-website',
    title: 'Personal Website',
    difficulty: 'Beginner',
    description: 'Create your own "About Me" homepage with hobbies, favorite books, and a fun greeting.',
    objectives: ['Use semantic <header> and <main>', 'Style cards with padding and border-radius', 'Add a working interactive greeting button'],
    instructions: '1. Replace the name and bio with your own facts.\n2. Update the 3 hobby cards.\n3. Customize the accent color in CSS and click Run.',
    starterHtml: `<header class="hero">\n  <h1>Hi, I am Alex!</h1>\n  <p>Builder, coder, and weekend cyclist.</p>\n  <button id="greetBtn">Say Hello</button>\n  <p id="greetMsg"></p>\n</header>\n<main class="grid">\n  <section class="card"><h2>Favorite Hobby</h2><p>Building LEGO cities and drawing race tracks.</p></section>\n  <section class="card"><h2>Favorite Book</h2><p>The Wild Robot by Peter Brown.</p></section>\n  <section class="card"><h2>Goal This Year</h2><p>Publish 3 websites in Family Connect!</p></section>\n</main>`,
    starterCss: `body { font-family: sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }\n.hero { background: #1e293b; color: white; padding: 32px 24px; text-align: center; }\nbutton { background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; }\n.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 24px; }\n.card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; }`,
    starterJs: `document.getElementById('greetBtn').addEventListener('click', () => {\n  document.getElementById('greetMsg').textContent = 'Thanks for visiting my personal page!';\n});`,
  },
  {
    slug: 'school-website',
    title: 'School Website',
    difficulty: 'Beginner',
    description: 'Build a clean school homepage with weekly timetable, club list, and announcements.',
    objectives: ['Build a formatted <table> timetable', 'Use <ul> for after-school clubs', 'Style clean header navigation'],
    instructions: '1. Update the school name and motto.\n2. Fill out your favorite classes in the timetable.\n3. Add an extra school club item.',
    starterHtml: `<header class="top">\n  <h1>Oakwood Elementary</h1>\n  <p>Curiosity, Kindness & Discovery</p>\n</header>\n<main class="wrap">\n  <section class="panel">\n    <h2>Weekly Schedule</h2>\n    <table>\n      <tr><th>Day</th><th>Morning</th><th>Afternoon</th></tr>\n      <tr><td>Monday</td><td>Math</td><td>Science Lab</td></tr>\n      <tr><td>Tuesday</td><td>Reading</td><td>Art Studio</td></tr>\n    </table>\n  </section>\n  <section class="panel">\n    <h2>After-School Clubs</h2>\n    <ul><li>Robotics Club</li><li>Junior Coding</li><li>Track & Field</li></ul>\n  </section>\n</main>`,
    starterCss: `body { font-family: sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }\n.top { background: #0f172a; color: white; padding: 24px; }\n.wrap { padding: 20px; display: grid; gap: 16px; }\n.panel { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; }\ntable { width: 100%; border-collapse: collapse; }\nth, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }`,
    starterJs: `console.log('School portal loaded');`,
  },
  {
    slug: 'family-website',
    title: 'Family Website',
    difficulty: 'Intermediate',
    description: 'Design a shared family memory board with member cards and weekend plans.',
    objectives: ['Use CSS Flexbox/Grid for family member cards', 'Add interactive weekend vote counter', 'Keep strong color contrast'],
    instructions: '1. Customize each family member card.\n2. Test the Saturday Night Activity vote button.\n3. Add one more family memory section.',
    starterHtml: `<header class="banner"><h1>Our Family Hub</h1><p>Stories, Saturday Adventures & Recipes</p></header>\n<main class="cards">\n  <div class="member"><h3>Dad</h3><p>Head Chef & Code Coach</p></div>\n  <div class="member"><h3>Leo (12)</h3><p>Track Strategist & JS Explorer</p></div>\n  <div class="member"><h3>Maya (9)</h3><p>UI Artist & Speed Racer</p></div>\n</main>\n<section class="vote">\n  <h2>Saturday Vote: Movie Night</h2>\n  <button id="voteBtn">Add Family Vote (<span id="count">0</span>)</button>\n</section>`,
    starterCss: `body { font-family: sans-serif; margin: 0; background: #f8fafc; padding: 20px; }\n.banner { background: #2563eb; color: white; padding: 24px; border-radius: 12px; margin-bottom: 16px; }\n.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }\n.member, .vote { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-top: 12px; }\nbutton { background: #0f172a; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; }`,
    starterJs: `let votes = 0;\ndocument.getElementById('voteBtn').addEventListener('click', () => {\n  votes++;\n  document.getElementById('count').textContent = votes;\n});`,
  },
  {
    slug: 'car-website',
    title: 'Car Website',
    difficulty: 'Intermediate',
    description: 'Showcase your favorite sports cars with specs tables and interactive color switcher.',
    objectives: ['Manipulate DOM styles with JavaScript', 'Format car specs cleanly', 'Apply hover transitions'],
    instructions: '1. Add your favorite car model name.\n2. Click the color buttons to change the showroom spotlight.\n3. Add a 3rd spec row.',
    starterHtml: `<div class="showroom">\n  <h1>Apex Motors Garage</h1>\n  <div id="carBox" class="car-card">\n    <h2>Turbo GT-X</h2>\n    <p>0–100 km/h: 3.1s · Electric Twin Motor</p>\n  </div>\n  <div class="controls">\n    <button onclick="paintCar('#2563eb')">Cobalt</button>\n    <button onclick="paintCar('#dc2626')">Racing Red</button>\n    <button onclick="paintCar('#059669')">Emerald</button>\n  </div>\n</div>`,
    starterCss: `body { font-family: sans-serif; padding: 24px; background: #0f172a; color: white; }\n.car-card { background: #2563eb; padding: 24px; border-radius: 12px; margin: 16px 0; transition: background 0.25s ease; }\nbutton { padding: 8px 16px; border-radius: 6px; border: 1px solid #475569; background: #1e293b; color: white; cursor: pointer; margin-right: 8px; }`,
    starterJs: `window.paintCar = (hex) => {\n  document.getElementById('carBox').style.background = hex;\n};`,
  },
  {
    slug: 'restaurant-website',
    title: 'Restaurant Website',
    difficulty: 'Intermediate',
    description: 'Build a family café menu site with categories, prices, and order total calculator.',
    objectives: ['Align prices cleanly using Flexbox', 'Build an interactive order calculator in JS', 'Practice warm, appetizing typography'],
    instructions: '1. Customize the café name and menu items.\n2. Click "+ Add" to test the bill calculator.\n3. Add a dessert item!',
    starterHtml: `<header><h1>Sunny Kitchen Café</h1><p>Fresh homemade waffles, smoothies & pasta</p></header>\n<main class="menu">\n  <div class="item"><span>Berry Waffle — $6</span><button onclick="addItem(6)">+ Add</button></div>\n  <div class="item"><span>Mango Smoothie — $4</span><button onclick="addItem(4)">+ Add</button></div>\n  <div class="item"><span>Cheesy Pasta — $8</span><button onclick="addItem(8)">+ Add</button></div>\n  <h3 class="total">Order Total: $<span id="total">0</span></h3>\n</main>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; background: #f8fafc; color: #0f172a; }\n.item { display: flex; justify-content: space-between; align-items: center; background: white; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; margin-bottom: 10px; }\nbutton { background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }`,
    starterJs: `let total = 0;\nwindow.addItem = (price) => {\n  total += price;\n  document.getElementById('total').textContent = total;\n};`,
  },
  {
    slug: 'portfolio',
    title: 'Portfolio',
    difficulty: 'Advanced',
    description: 'Present your best drawings, coding builds, and science projects in a filterable gallery.',
    objectives: ['Implement category filtering in JavaScript', 'Use responsive CSS Grid', 'Write concise project descriptions'],
    instructions: '1. Edit the project titles to match things you created.\n2. Click the filter buttons to test filtering.\n3. Add a 4th project card.',
    starterHtml: `<h1>My Creator Portfolio</h1>\n<div class="tabs">\n  <button onclick="filterCards('all')">All</button>\n  <button onclick="filterCards('code')">Code</button>\n  <button onclick="filterCards('art')">Art</button>\n</div>\n<div class="gallery">\n  <div class="work" data-cat="code">HTML Quiz App</div>\n  <div class="work" data-cat="art">Solar System Poster</div>\n  <div class="work" data-cat="code">CSS Grid Gallery</div>\n</div>`,
    starterCss: `body { font-family: sans-serif; padding: 20px; background: #f8fafc; }\n.tabs { margin-bottom: 14px; display: flex; gap: 8px; }\nbutton { padding: 6px 14px; border: 1px solid #cbd5e1; background: white; border-radius: 6px; cursor: pointer; }\n.gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }\n.work { background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; font-weight: 600; }`,
    starterJs: `window.filterCards = (cat) => {\n  document.querySelectorAll('.work').forEach((el) => {\n    el.style.display = (cat === 'all' || el.dataset.cat === cat) ? 'block' : 'none';\n  });\n};`,
  },
  {
    slug: 'multi-page-website',
    title: 'Multi-page Website',
    difficulty: 'Advanced',
    description: 'Build an app-like multi-view website with Home, Gallery, and Contact pages.',
    objectives: ['Switch views dynamically using JavaScript navigation', 'Maintain a shared header across all views', 'Validate a contact form'],
    instructions: '1. Click Home, Gallery, and Contact in the top bar.\n2. Customize the content of all three pages.\n3. Test submitting the Contact form.',
    starterHtml: `<header class="nav">\n  <strong>Voyager Site</strong>\n  <div>\n    <button onclick="showPage('home')">Home</button>\n    <button onclick="showPage('gallery')">Gallery</button>\n    <button onclick="showPage('contact')">Contact</button>\n  </div>\n</header>\n<main id="page-home" class="page"><h2>Welcome Home</h2><p>Switch tabs above to explore multiple views!</p></main>\n<main id="page-gallery" class="page" style="display:none;"><h2>Project Gallery</h2><p>Here are 3 highlights from this term.</p></main>\n<main id="page-contact" class="page" style="display:none;"><h2>Send a Note</h2><input placeholder="Your message" /><button onclick="alert('Message saved!')">Send</button></main>`,
    starterCss: `body { font-family: sans-serif; margin: 0; background: #f8fafc; }\n.nav { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: white; padding: 14px 20px; }\n.nav button { background: transparent; color: white; border: 1px solid #475569; padding: 6px 12px; border-radius: 6px; margin-left: 6px; cursor: pointer; }\n.page { padding: 24px; background: white; margin: 20px; border: 1px solid #e2e8f0; border-radius: 10px; }`,
    starterJs: `window.showPage = (id) => {\n  document.querySelectorAll('.page').forEach((p) => p.style.display = 'none');\n  document.getElementById('page-' + id).style.display = 'block';\n};`,
  },
];
