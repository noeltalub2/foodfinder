const getIndex = (req, res, next) => {
	res.render("index")
};
const getError403 = (req, res, next) => {
	res.render("error403");
};

const getError404 = (req, res, next) => {
	res.render("error404");
};

module.exports = {getIndex,getError404,getError403}