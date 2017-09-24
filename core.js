// variables   
var pageNum = 1;
var canvas;
var ctx;
var pdfDoc = null;
var scale = 0.8;
var pageNumPending = null;
var pageRendering = false;
var selectionCounter = 0;
var selections = [];
/*
 * Add a new div as a Selection
 * @param currentPage: current Page number.
 */
function addSelection(currentPage) {
	var newId = "selection" + selectionCounter + "-" + currentPage;
	$("#divPainting")
		.append(createSelection({
			"id": newId,
			"title": "Apartado",
			"page": currentPage,
			"posIni": {
				"left": 0,
				"top": 0
			},
			"posFin": {
				"left": canvas.style.position.left + 100,
				"top": canvas.style.position.top + 100
			}
		}));
		
	$("#color" + newId)
		.val("#" + $("#" + newId)
			.css("background-color")
			.split("(")[1].split(")")[0].split(",")
			.map(function(x) {
				var x = parseInt(x)
					.toString(16);
				return (x.length == 1) ? "0" + x : x;
			})
			.join(""));
			
	$("#menuMain" + newId).css("width", $("#color" + newId).width());

	
	selectionCounter++;
	
}

function createBar(value) {
	
	var topBar = $("<div>")
		.addClass("topBar")
		.attr("id", "bar" + value.id)
		.text(value.title);
	
	var menuMain = $("<ul>").attr("id", "menuMain" + value.id);
	var firstLi = $("<li>");
	var divButton = $("<div>");
	var menuButton = $("<button>").text("\u2630");
	var secondMenu = $("<ul>").css("width","200px");
	var secondLi = $("<li>");
	var divColor = $("<div>").text("Selección color");
	
	var colorInput = $("<input>")
		.attr({
			"type": "color",
			"id": "color" + value.id
		}).on("change", function() {
			$("#" + value.id)
				.css("background-color", $("#color" + value.id)
					.val());
			
		}).addClass("leftPos").val($("#" + value.id)
			.css("background-color"));
		
	divColor.append(colorInput);
	secondLi.append(divColor);
	secondMenu.append(secondLi);
	divButton.append(menuButton);
	firstLi.append(divButton).append(secondMenu);
	menuMain.append(firstLi).menu();
	
	topBar.append(menuMain);//.append(colorInput);
	
	return topBar;
}
/*
 * Create a div as a Selection
 * @param value: JSON object with all the information required
 */
function createSelection(value) {
	var index = 2;
	var slider = $("<div>")
		.slider({
			max: 1,
			min: 0.30,
			step: 0.01,
			slide: function(event, ui) {
				$("#" + value.id)
					.css({
						opacity: ui.value
					})
			}
		});
	
	var newDiv = $("<div>")
		.draggable({
			containment: "#divPainting"
		})
		.resizable({
			containment: "#divPainting",
			handles: "all"
		})
		.addClass("selection")
		.attr("id", value.id)
		.css({
			"position": "absolute",
			"left": value.posIni.left,
			"top": value.posIni.top,
			"width": value.posFin.left - value.posIni.left,
			"height": value.posFin.top - value.posIni.top,
			"z-index": index
		})
		.append(createBar(value)).append(slider);//append(textArea);
	return newDiv;
}

function saveSelectionsFromPage() {
	$("#divPainting div.selection")
		.each(function(i) {
			var myObject = new Object();
			myObject.page = this.id.substring(this.id.indexOf("-") + 1);
			myObject.posIni = $(this)
				.position();
			myObject.id = this.id;
			myObject.title = $(this)
				.find(".topBar")
				.contents()
				.filter(function() {
					return this.nodeType == Node.TEXT_NODE;
				})
				.text();
			myObject.posFin = {
				"left": myObject.posIni.left + $(this)
					.width(),
				"top": myObject.posIni.top + $(this)
					.height()
			};
			selections.push(myObject);
		});
}

function loadSelectionsIntoPage(currentPage) {
	var selectionsPrima = [];
	$.each(selections, function(index, value) {
		if (value.page == currentPage) {
			$("#divPainting")
				.append(createSelection(value));
		} else selectionsPrima.push(value);
	});
	selections = selectionsPrima;
}
/*
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num) {
	pageRendering = true;
	// Using promise to fetch the page
	pdfDoc.getPage(num)
		.then(function(page) {
			var viewport = page.getViewport(scale);
			canvas.style.position = "absolute";
			canvas.height = viewport.height;
			canvas.width = viewport.width;
			$("#divPainting")
				.css({
					"height": canvas.height,
					"width": canvas.width,
					"position": "absolute",
					"left": canvas.style.position.left,
					"top": canvas.style.position.top,
					"z-index": 1
				});
			// Render PDF page into canvas context
			var renderContext = {
				canvasContext: ctx,
				viewport: viewport
			};
			var renderTask = page.render(renderContext);
			// Wait for rendering to finish
			renderTask.promise.then(function() {
				pageRendering = false;
				if (pageNumPending !== null) {
					// New page rendering is pending
					renderPage(pageNumPending);
					pageNumPending = null;
				}
			});
		});
	$("#page_num")
		.text(pageNum);
	saveSelectionsFromPage();
	$("#divPainting div.selection")
		.remove();
	loadSelectionsIntoPage(num);
}
/*
 * If another page rendering in progress, waits until the rendering is
 * finised. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
	if (pageRendering) {
		pageNumPending = num;
	} else {
		renderPage(num);
	}
}
/*
 * Get coordenates relatives to the canvas
 */
function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
}

function loadFile() {
	var url = "examen.pdf";
	PDFJS.workerSrc = "./pdf.worker.js";
	canvas = $("#canvasFile")[0];
	ctx = canvas.getContext("2d");
	PDFJS.getDocument(url)
		.then(function(doc) {
			pdfDoc = doc;
			$("#page_count")
				.text(pdfDoc.numPages);
			renderPage(1);
			updateArrows();
		});
}

function updateArrows() {
	if (pageNum > 1) {
		$("#leftIcon")
			.button("enable");
	} else {
		$("#leftIcon")
			.button("disable");
	}
	if (pageNum < pdfDoc.numPages) {
		$("#rightIcon")
			.button("enable");
	} else {
		$("#rightIcon")
			.button("disable");
	}
}

function loadToolbar() {
	$("#toolbar")
		.draggable();
	$("#addIcon")
		.button({
			classes: {
				"ui-button": "highlight"
			},
			label: "New selection",
			showLabel: false,
			icon: "ui-icon-plus"
		})
		.click(function() {
			addSelection(pageNum);
		});
	$("#leftIcon")
		.button({
			classes: {
				"ui-button": "highlight"
			},
			label: "Previous page",
			showLabel: false,
			icon: "ui-icon-arrow-1-w"
		})
		.click(function() {
			if (pageNum > 1) {
				pageNum--;
				queueRenderPage(pageNum);
			}
			updateArrows();
		});
	$("#rightIcon")
		.button({
			classes: {
				"ui-button": "highlight"
			},
			label: "Next page",
			showLabel: false,
			icon: "ui-icon-arrow-1-e"
		})
		.click(function() {
			if (pageNum < pdfDoc.numPages) {
				pageNum++;
				queueRenderPage(pageNum);
			}
			updateArrows();
		});
	$("#loadIcon")
		.button({
			classes: {
				"ui-button": "highlight"
			},
			label: "Load selections",
			showLabel: false,
			icon: "ui-icon-script"
		})
		.click(function() {
			selections = JSON.parse(localStorage.getItem("selections"));
			loadSelectionsIntoPage(pageNum);
		});
	$("#saveIcon")
		.button({
			classes: {
				"ui-button": "highlight"
			},
			label: "Save selections",
			showLabel: false,
			icon: "ui-icon-disk"
		})
		.click(function() {
			saveSelectionsFromPage();
			localStorage.setItem("selections", JSON.stringify(selections));
		});
}
// Main program
$(document)
	.ready(function() {
		loadFile();
		loadToolbar();
	});