const express = require('express');
const { create } = require('express-handlebars');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 8080;

// Configuración de Handlebars
const hbs = create({
    extname: '.handlebars',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts')
});

app.engine('.handlebars', hbs.engine);
app.set('view engine', '.handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const productsFilePath = path.join(__dirname, 'productos.json');
const cartsFilePath = path.join(__dirname, 'carrito.json');

const readFile = (filePath) => {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const writeFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

if (!fs.existsSync(productsFilePath)) writeFile(productsFilePath, []);
if (!fs.existsSync(cartsFilePath)) writeFile(cartsFilePath, []);

let products = readFile(productsFilePath);
let carts = readFile(cartsFilePath);

// Rutas para productos
const productsRouter = express.Router();

productsRouter.get('/', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : products.length;
    res.json(products.slice(0, limit));
});

productsRouter.get('/:pid', (req, res) => {
    const product = products.find(p => p.id === req.params.pid);
    if (product) {
        res.json(product);
    } else {
        res.status(404).send('Producto no encontrado');
    }
});

productsRouter.post('/', (req, res) => {
    const { title, description, code, price, status = true, stock, category, thumbnails = [] } = req.body;
    const newProduct = {
        id: (products.length + 1).toString(),
        title,
        description,
        code,
        price,
        status,
        stock,
        category,
        thumbnails
    };
    products.push(newProduct);
    writeFile(productsFilePath, products);
    io.emit('productAdded', newProduct);
    res.status(201).json(newProduct);
});

productsRouter.put('/:pid', (req, res) => {
    const productIndex = products.findIndex(p => p.id === req.params.pid);
    if (productIndex !== -1) {
        const updatedProduct = { ...products[productIndex], ...req.body, id: products[productIndex].id };
        products[productIndex] = updatedProduct;
        writeFile(productsFilePath, products);
        io.emit('productUpdated', updatedProduct);
        res.json(updatedProduct);
    } else {
        res.status(404).send('Producto no encontrado');
    }
});

productsRouter.delete('/:pid', (req, res) => {
    const productIndex = products.findIndex(p => p.id === req.params.pid);
    if (productIndex !== -1) {
        const deletedProduct = products.splice(productIndex, 1);
        writeFile(productsFilePath, products);
        io.emit('productDeleted', req.params.pid);
        res.status(204).send();
    } else {
        res.status(404).send('Producto no encontrado');
    }
});

app.use('/api/productos', productsRouter);

// Rutas para carritos
const cartsRouter = express.Router();

cartsRouter.post('/', (req, res) => {
    const newCart = {
        id: (carts.length + 1).toString(),
        products: []
    };
    carts.push(newCart);
    writeFile(cartsFilePath, carts);
    res.status(201).json(newCart);
});

cartsRouter.get('/:cid', (req, res) => {
    const cart = carts.find(c => c.id === req.params.cid);
    if (cart) {
        res.json(cart.products);
    } else {
        res.status(404).send('Carrito no encontrado');
    }
});

cartsRouter.post('/:cid/product/:pid', (req, res) => {
    const cart = carts.find(c => c.id === req.params.cid);
    if (!cart) {
        return res.status(404).send('Carrito no encontrado');
    }

    const product = products.find(p => p.id === req.params.pid);
    if (!product) {
        return res.status(404).send('Producto no encontrado');
    }

    const cartProduct = cart.products.find(p => p.product === req.params.pid);
    if (cartProduct) {
        cartProduct.quantity += 1;
    } else {
        cart.products.push({ product: req.params.pid, quantity: 1 });
    }

    writeFile(cartsFilePath, carts);
    res.status(201).json(cart);
});

app.use('/api/carts', cartsRouter);

// Vistas
app.get('/home', (req, res) => {
    res.render('home', { products });
});

app.get('/realtimeproducts', (req, res) => {
    res.render('realTimeProducts', { products });
});

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');
});

server.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});

