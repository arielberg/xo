import { getList , runScript } from '../js/loader.js';
import {appendToList} from  '../js/utils.js';
import { createOffer } from '../js/WebRtc.js';

export async function run(containerId = "content", params) {
  
    console.log('aaa', createOffer());
   
}