import React from 'react';
import { render } from '@testing-library/react';
import App from './App';
import {originalRule} from './World'

test('should return 0 when all cells are dead', function () {
  var cell = Array(3).fill(Array(3).fill(0));
  var result = originalRule(cell);
  expect(result).toBe(0);
});

test('should return 0 when all cells are alive', function () {
  var cell = Array(3).fill(Array(3).fill(1));
  var result = originalRule(cell);
  expect(result).toBe(0);
});

test('should return 1 when alive and north and south are on', function () {
  var cell = [[0, 1, 0],
    [0, 1, 0],
    [0, 1, 0]];
  var result = originalRule(cell);
  expect(result).toBe(1);
});

test('should return 1 when alive and east and west are on', function () {
  var cell = [[0, 0, 0],
    [1, 0, 1],
    [0, 1, 0]];
  var result = originalRule(cell);
  expect(result).toBe(1);
});

test('should return 1 when alive and east and west are on', function () {
  var cell = [[0, 0, 0],
    [1, 0, 1],
    [0, 1, 0]];
  var result = originalRule(cell);
  expect(result).toBe(1);
});


