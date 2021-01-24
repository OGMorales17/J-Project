$('document').ready(function () {
    // const $RemoveCss = $('link[rel="stylesheet"]')
    // $RemoveCss.remove();
    //the next one will be append to the head
    const $fontAwesomCdn = $('<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/all.css" rel="stylesheet"></link>')
    const $myHeader = $('<header>')
    const $h1 = $('<h1>').text('Jeopardy');
    const $button = $('<button>').text('Start!')
    // create div container that game board will populate
    const $boardContainer = $('<div id="table-container"></div>')
    $('head').append($fontAwesomCdn)
    $('body').prepend($myHeader)
    $('header').append($h1, [$button])
    $($boardContainer).insertAfter('header')
})



// function to generate random numbers
// let arrOfIds = [];
// function getCategoryIds(arr) {
//     for (let i = 0; i < 6; i++) {
//         arr.push(Math.floor(Math.random() * 800) + 1)
//     }
// }

// getCategoryIds(arrOfIds)


/*---------------------------------------------------------------------------------------------------------------------- */


// categories is the main data structure for the app; it looks like this:

//  [
//    { title: "Math",
//      clues: [
//        {question: "2+2", answer: 4, showing: null},
//        {question: "1+1", answer: 2, showing: null}
//        ...
//      ],
//    },
//    { title: "Literature",
//      clues: [
//        {question: "Hamlet Author", answer: "Shakespeare", showing: null},
//        {question: "Bell Jar Author", answer: "Plath", showing: null},
//        ...
//      ],
//    },
//    ...
//  ]

// ~~~ API GLOBALS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ API GLOBALS ~~~~~~~~~~~~~~~~~~~~~~~~~~~

let categories = [];  // holds all the categories and questions
const BASE_URL = `https://jservice.io/api`;
const QUESTION_COUNT = 5;
const CATEGORY_COUNT = 6;

// ~~~ CATEGORIES AND CLUES ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ CATEGORIES AND CLUES ~~~~~~~~~~~~~~~~~~~

class Category {
    /** Get NUM_CATEGORIES random category from API.
    * Returns array of category ids
    */
    static async getCategoryIds() {
        const response = await axios.get(`${BASE_URL}/categories`, {
            params: {
                count: "100",
                offset: Math.floor(Math.random() * (500 - 1) + 1) // RNG to vary offset between each request
            }
        });

        // Lodash selects 6 random categories
        const randomCategories = _.sampleSize(response.data, CATEGORY_COUNT)

        // make new array with only the category IDs
        const categoryIds = randomCategories.map((catObj) => {
            return catObj.id;
        });

        return categoryIds;
    }

    // Fill 'categories' array with 6 objects, each with 5 questions
    static async getAllCategoriesAndQuestions() {
        categories = [];
        const categoryIds = await Category.getCategoryIds();
        for (let categoryId of categoryIds) {
            const fullCategory = await Category.getCategory(categoryId);
            categories.push(fullCategory);
        }
        return categories;
    }


    /** Return object with data about a category:
     *
     *  Returns {
     *    title: "Math",
     *    clues: clue-array
     *  }
     *
     * Where clue-array is:
     *   [
     *      {question: "Hamlet Author", answer: "Shakespeare", showing: null},
     *      {question: "Bell Jar Author", answer: "Plath", showing: null},
     *      ...
     *   ]
     */
    static async getCategory(catId) {
        const response = await axios.get(`${BASE_URL}/clues`, {
            params: {
                category: catId
            }
        });
        // Lodash selects 5 random questions
        const selectFiveQuestions = _.sampleSize(response.data, QUESTION_COUNT);

        // format each question object inside array
        const questionArray = selectFiveQuestions.map((question) => {

            if (question.answer.startsWith('<i>')) {
                question.answer = question.answer.slice(3, -3);
            }
            return {
                question: question.question,
                answer: question.answer,
                showing: null
            }
        });

        const categoryQuestions = {
            title: response.data[0].category.title, // get category title from 'response'
            clues: questionArray
        }
        return categoryQuestions;
    }
}


$(async function () {
    const $button = $("button");
    const $tDiv = $("#table-container");

    // for formatting category titles
    function toTitleCase(str) {
        const lcStr = str.toLowerCase();
        return lcStr.replace(/(?:^|\s)\w/g, (match) => {
            return match.toUpperCase();
        });
    }

    /** Fill the HTML table with the categories & cells for questions.
     * - The <thead> should be filled w/a <tr>, and a <td> for each category
     * - The <tbody> should be filled w/NUM-QUESTIONS_PER_CAT <tr>s,
     *   each with a question for each category in a <td>
     *   (initally, just show a "?" where the question/answer would go.)
     */
    async function fillTable() {
        const $tHead = $("<thead>");
        const $tBody = $("<tbody>");
        const $table = $("<table>")
            .prepend($tHead)
            .append($tBody);

        // generate each table cell with '?', add coordinate ID, append to row, row appends to tbody
        for (let j = 0; j < QUESTION_COUNT; j++) {
            let $tRow = $("<tr>");
            for (let i = 0; i < CATEGORY_COUNT; i++) {
                let $qMark = $("<i>")
                    .attr("class", "fas fa-question-circle");
                let $tCell = $("<td>")
                    .attr("id", `${i}-${j}`)
                    .append($qMark);
                $tRow.append($tCell);
            }
            $tBody.append($tRow);
        }

        // generate header cells, apply category title on the way, append to thead
        for (let k = 0; k < CATEGORY_COUNT; k++) {
            let $tCell = $("<th>")
                .attr("id", `cat-${k}`)
                .text(toTitleCase(categories[k].title));
            $tHead.append($tCell);
        }

        // append whole table to container div
        $tDiv.append($table);

    }

    /** Handle clicking on a clue: show the question or answer.
     * 
     * Uses .showing property on clue to determine what to show:
     * - if currently null, show question & set .showing to "question"
     * - if currently "question", show answer & set .showing to "answer"
     * - if currently "answer", ignore click
     * 
     * Each table cell has a unique x-y coordinate ID, which maps to the category
     * and question within that category.
     * 
     * x = category (0-5, going across table, also is index of global array categories)
     * y = question (0-4, going down table, also is index of question array inside chosen category)
     * 
     * example: clicking on a cell with the ID '2-4' will access categories[2].clues[4]
     * 
     * */
    function showQuestionOrAnswer(id) {
        const $clickedCell = $(`#${id}`);
        const category = id.slice(0, 1);
        const question = id.slice(2);

        // shorthand variables for game data
        const theCell = categories[category].clues[question];
        const theQuestion = theCell.question;
        const theAnswer = theCell.answer;

        // check clicked question for what .showing is
        if (theCell.showing === null) { // show the question
            $clickedCell.text(theQuestion);
            theCell.showing = "question";
        }
        else if (theCell.showing === "question") { // show the answer
            $clickedCell.toggleClass("answer")
            $clickedCell.text(theAnswer);
            theCell.showing = "answer";
            $clickedCell.toggleClass("not-allowed");
        }
    }

    /** Wipe the current Jeopardy board, show the loading spinner,
     * and update the button used to fetch data.
     */
    function showLoadingView() {
        $button.text("Loading...").toggleClass("not-allowed");
        $tDiv.empty(); // clear game board
        const $loading = $("<i>")
            .attr("class", "fas fa-spinner fa-pulse loader");
        $tDiv.append($loading);
    }

    /** Remove the loading spinner and update the button used to fetch data. */
    function hideLoadingView() {
        $button.text("Restart!").toggleClass("not-allowed");
        $tDiv.empty(); // clear loading icon before table arrives
    }

    /** Start game: button press
     *
     * - get random category Ids
     * - get data for each category
     * - create HTML table
     * */
    async function setupAndStart() {
        showLoadingView(); // start load screen
        await Category.getAllCategoriesAndQuestions(); // call API and format data
        hideLoadingView(); // hide load screen
        fillTable(); // table creation and labeling
        addListeners(); // apply event listener to table
    }

    /** On click of start / restart button, set up game. */
    $button.on("click", async () => {
        setupAndStart();
    });

    /** On page load, add event handler for clicking clues */
    async function addListeners() {
        const $gameTable = $("table");
        $gameTable.on("click", "td", (evt) => {
            showQuestionOrAnswer(evt.target.id);
        });
    }
});