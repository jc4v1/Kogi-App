// utils/parsers.js
import * as XLSX from 'xlsx';

export const parseGoalModel = (jsonContent) => {
  try {
    const goalModel = JSON.parse(jsonContent);
    return {
      success: true,
      data: goalModel,
      message: 'Goal model parsed successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      message: `Error parsing goal model: ${error.message}`
    };
  }
};

export const parsePNMLModel = (xmlContent) => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
    
    const places = Array.from(xmlDoc.querySelectorAll('place'))
      .filter(place => place.getAttribute('id')) // Filter out elements without ID
      .map(place => {
        const placeData = {
          id: place.getAttribute('id'),
          name: place.querySelector('name text')?.textContent || place.getAttribute('id'),
          initialTokens: 0
        };
        
        // Check for initial marking
        const initialMarking = place.querySelector('initialMarking text');
        if (initialMarking) {
          placeData.initialTokens = parseInt(initialMarking.textContent) || 0;
        }
        
        return placeData;
      });
    
    const transitions = Array.from(xmlDoc.querySelectorAll('transition'))
      .filter(transition => transition.getAttribute('id')) // Filter out elements without ID
      .map(transition => ({
        id: transition.getAttribute('id'),
        name: transition.querySelector('name text')?.textContent || transition.getAttribute('id')
      }));
    
    const arcs = Array.from(xmlDoc.querySelectorAll('arc'))
      .filter(arc => arc.getAttribute('id') && arc.getAttribute('source') && arc.getAttribute('target')) // Filter out incomplete arcs
      .map(arc => ({
        id: arc.getAttribute('id'),
        source: arc.getAttribute('source'),
        target: arc.getAttribute('target'),
        weight: 1 // Default weight, could be parsed from inscription
      }));
    
    console.log('Parsed PNML:', { 
      places: places.length, 
      transitions: transitions.length, 
      arcs: arcs.length 
    });
    
    return {
      success: true,
      data: { places, transitions, arcs },
      message: 'PNML model parsed successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      message: `Error parsing PNML model: ${error.message}`
    };
  }
};

export const parseMappingFile = (fileBuffer) => {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const mappingData = XLSX.utils.sheet_to_json(worksheet);
    
    return {
      success: true,
      data: mappingData,
      message: 'Mapping file parsed successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      message: `Error parsing mapping file: ${error.message}`
    };
  }
};