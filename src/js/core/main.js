/**
 * main.js
 * Core engine for the portfolio
 */

import { initThreeBackground } from "../background/threeBackground.js";

console.log("Portfolio Engine Started");



/* =========================
   START THREE BACKGROUND
========================= */

initThreeBackground();



/* =========================
   TITLE TYPING ANIMATION
========================= */

const titleEl = document.getElementById("title");

if (titleEl) {

const fullText = titleEl.textContent.trim();

titleEl.textContent = "";

let i = 0;

function type(){

if(i < fullText.length){

titleEl.textContent += fullText[i];

i++;

setTimeout(type,40);

}

}

type();

}



/* =========================
   BUTTON INTERACTION
========================= */

const viewBtn = document.getElementById("view-work");

if(viewBtn){

viewBtn.addEventListener("click",()=>{

viewBtn.animate(

[
{transform:"translateY(0px)"},
{transform:"translateY(-6px)"},
{transform:"translateY(0px)"}
],

{
duration:400,
easing:"ease-out"
}

);

});

}