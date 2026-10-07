import React from 'react';
import {createRoot} from 'react-dom/client';
import Marketplace, {Footer} from './app/marketplace';
import SearchPage from './app/search/search-page';
import {ProductDetails} from './components/loop/product-details';
import {products} from './lib/catalog';
import './app/globals.css';
const path = window.location.pathname;
const product = path.match(/^\/commerce\/product\/([^/]+)$/)?.[1];
const selected = products.find(item => item.id === product);
const live = new URLSearchParams(location.search).get('live') === '1';
createRoot(document.getElementById('root')!).render(selected && !live
  ? <><header className="header"><a className="logo" href="/commerce/">loop<span>●</span></a><a className="back-link" href="/commerce/search">Back to all finds</a><a className="button dark" style={{marginLeft:'auto'}} href={`/commerce/product/${selected.id}?live=1`}>Ask about this product</a></header><main className="container"><ProductDetails p={selected}/></main><Footer/></>
  : path.includes('/search') || selected
  ? <SearchPage initialLive={new URLSearchParams(location.search).get('live') === '1'} initialProductId={product}/>
  : <Marketplace/>);
