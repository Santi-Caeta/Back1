const socket = io();

socket.on('productAdded', (product) => {
    const productList = document.getElementById('product-list');
    const newProduct = document.createElement('li');
    newProduct.id = `product-${product.id}`;
    newProduct.textContent = `${product.title} - ${product.price}`;
    productList.appendChild(newProduct);
});

socket.on('productUpdated', (product) => {
    const productItem = document.getElementById(`product-${product.id}`);
    if (productItem) {
        productItem.textContent = `${product.title} - ${product.price}`;
    }
});

socket.on('productDeleted', (productId) => {
    const productItem = document.getElementById(`product-${productId}`);
    if (productItem) {
        productItem.remove();
    }
});
