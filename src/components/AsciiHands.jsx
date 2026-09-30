


import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Two-half ASCII art (reaching hands), matching the REAL technique used
 * by the reference site (confirmed via DevTools inspection):
 *
 * The <pre> holds plain text. On hover, a SPARSE, RANDOMLY-CHANGING
 * subset of character positions near the cursor get wrapped in
 * <span style="color:#0a0a0a;background:#ff3b14"> — everything else
 * stays as plain text. Because only a small number of characters are
 * ever "hot" at once (not the whole hover radius), rebuilding the
 * innerHTML each frame is cheap — this is NOT canvas, it's real DOM
 * text manipulation, same as the reference.
 *
 * How the trail/glitch look comes together:
 * - Each character has a heat value (0-1), same idea as before.
 * - Proximity to the cursor sets a CHANCE of lighting up (re-rolled
 *   every frame via Math.random()), not a guarantee — that's the
 *   scattered/glitchy selection.
 * - Heat decays every frame, so recently-hot characters fade out
 *   over a few frames — that's the trail.
 * - Only characters with heat above a small threshold get wrapped in
 *   a <span>; everything else is left as plain text for performance.
 */

const LEFT_ASCII_LINES = [
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                      ..                                                                                                ",
  "                                                                                            .,:;;<<>>>>>>>>>>>><<<;:,...                                                                                ",
  "                                                                                       .,:;<<<<<<<<<<>>((()))))(()(((((>><<;:...                                                                        ",
  "                                                                                    .:;;:::,,,,,,:::;;<>((((((())))((((>>>>((>>(((><;:,,.......                                                         ",
  "                                                                                  ,;<;:............,,:;<>>>>(((((((((((>>>>>>>>>>())[[[][))))))((((>>><;;,                                              ",
  "                                                                            .,,:;<<<:...........,,.,::;;<>><<<<>((((((>>>><;;::::;<<<<<>(()))[]]{{{[[[[[[[(<.                                           ",
  "                                                                      ...,,:;;;<<<;;;;;;;;::,,::::::;<><<<;;;;;;<>>>>><<<<::,....,,::;<<<<><;<>>(()))[[[]{{}{;                                          ",
  "                                                                ..,,,,,,,,,,::;;<<<<>())))((>>>((><>)))(<;;;;:,,,::;;<<><<<;,.....,,,::;;<<;;;;;;;<<>>>>(()[}/(.                                        ",
  "                                                            .,,,,,,,,,,,,::;<<>>>(()[]]{{{{{]]{{{{{{{]))(<;;,,.....,:;<<><<<;,.......,,:;;;<;;;:.,::;;;<>()))][}}[<:.                                   ",
  "                                                        .,:;:,,,,,,,,:;;;<>>>(()[]]{\\//||||/|||\u00ab||||\u00ab/}})<;;,,......,,:;<<<<>;:,.....,,:;<>>>>><:,...,,:;<())))]}}/||\\{[>:                              ",
  "                                                     ,,;;;;::,:::;;;;;<>>())[]]}//|||\u00ab||||///|||/|||\u00ab\u00ab\u00ab\u00ab\\]><;::::,.....,:;<<<><;::::;;<>>(((((>>><;:,.,,::;<>()[[[[]{\\/|\u00ab|\\{(:.                         ",
  "                                               ..,:;;<;;;;;;;;;;<<>>>()[]{{}}}\\||||||||///\\\\\\//////|\u00ab\u00ab\u00ab\u00ab|/}><;;;:........,:;;<><<;<<<>)]{{{{{}])(((>>;:;::;;;<<><>>>(()[]}/||/\\{[<.                     ",
  "                                   .......,,:;;;<<<<<<;;;;;<<><<((>(()[]]{{}}}/||||||/////|||||\u00ab\u00ab\u00ab\u00ab\u00ab||//|\u00ab\u00ab\\(><<<:,,......,::<>>>>>>(({\\//\\////\\{)>>(][<<<<<<<>>><<;;;<<<>()[]{{}/}(.                   ",
  "                 ..,:::::;;;;;;;;;;;;<<<<<<<<<<<<<<<<<<;;<<<;<>(((((())[]]{}\\///|||||//|\u00ab\u00ab\u00bb\u00ab\u00ab\u00ab\u00ab\u00ab|||||||\u00ab\u00bb\u00bb\u00bb\u00ab)>>>><;:,,.....,,:;<<>>>()[/|\u00bb\u00ab|||\\[([{/\u00ab|[(>;<>()[{)><<;<<<<<;<>)))){||{,                  ",
  "           .,,:;;;<<<<;;;;;<<<<<<<<<<<<<<<<<<;;;;;;;;;;;;<<<<<>>>(()()]]{}}\\//|||///|\u00ab\u00ab\u00bb\u00bb\u00bb\u00ab\u00ab||///|||\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb|}>>>>>(((;:,,,,,,..,,::;<>>)]/\u00ab\u00bb\u00ab//\\\\|\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab||}{{/\u00ab\u00bb\u00bb\u00bb/]][)>><<<><>)>([}\\//(                 ",
  "....,,:::;;;<<<<<<><<<<<<<<<<<<<<<<<<;;;<<;;;;;;;;;;;;;;<<<<>>>((()()[]{}\\/|\u00ab\u00ab||//|\u00ab\u00bb\u00bb\u00bb\u00ab\u00ab||||||\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb|{(:.  ,<>>())(><<;;;:,..,,,..::;(]||\u00bb\u00ab\u00bb\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\u00ab/\\\\/\\)))(()()/|};               ",
  ";;;<<<<<<;;;;<<<><<;<<<<;;<<<;;;;;;;<<<<;;;;;;;;;<<;;;;<<>>>>(())))[]{}}}/\u00ab\u00ab\u00ab\u00ab||\u00ab\u00ab\u00bb\u00bb\u00ab\u00ab\u00ab|||\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00ab\\[>:.        :<(((()(><<>>;;,,,...,:::>{/\u00ab\u00bb\u00bb<,<({\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb}))(><<>]/|[.             ",
  ";;<<<<<<<<<;;;;;<<<;;<<<<;;;;;;;;;;<;;;;;;;;;<<<<<<<<<<<>(((((())]]{{}\\/|\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00ab|\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|[:              .;<((([])<>{];;:,...,:::<[{/\u00ab\u00bb/<   :{\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|}])((>>({/\\:            ",
  "<<<<<<<<<<<<<;;;<<<;;<<;<<<;;;;;;;<<<<;;;;;;;<;;;<<<<<>>>>>>(()[]{{}\\//|\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab[.                  .;>([]}{)>\\[;;,...,:;>)[[]{\\\u00ab\u00ab\\]:  >\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb[([]{][[[\\/<           ",
  ">>>><<<;;;<<;;;;<<<;;<<;;<<<;;;;;;<<<<<<;;;;<<<<<<<<<<>>(((([[]{{}}/|||\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00ab\u00ab\u00bb\u00bb\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\\:                      .;)))]}}]}]><;;;;<<>>>><>(]\\|||[<<\\\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\\,</\u00bb\u00bb\u00bb\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab: .<{/{][[\\|(          ",
  ">>>>>><<<<<;;;;;;<;;<;>><<<<<;;;<<<<<;;<;;<<<<<<<>>>>>((()[]]]{}\\/||\u00ab||\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb/>                           .,:;>>;)(;;;<<<<>>><<<<<>(]}/|\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|. .>\\\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb{   .(}{[]{/|(         ",
  ">>>>>>>><<<<;;;;<;<<;<>>><<<<<<<<<<<<;;<<<><>>(((((((())[]]]{}\\/|||\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|).                                         ..,:;<>(><<<<>([]{\\|\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb:    :]\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb<    ;]{][}/|>        ",
  ">>>>>>>>>>><<<;<<;<<<<<<<<<<<<;;;<<<<<<<>(((((((((())]]]]}}}\\///||\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb],                                                 .:<>>>>()][[)[[{/\u00bb\u00bb\u00bb<      )\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|,    .;([]]{{:       ",
  ">>>>>>>>>><>><><<<<<<<<;<<<<<<<<<<<<<>>>>(()())[[[[{]]{{\\///|||\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb{:                                                      .:<())(()))[{[}|\u00ab}.      {\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb)       .,,.         ",
  ">>>>>>>>>><>>>>>>>>>><<<<;<<<<<<<<<>>(()))[][]]{}}}\\\\\\//|||\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb]:                                                           .;>>()[]\\\\\\}}|\u00ab{       ]\u00bb\u00bb\u00bb\u00bb\u00bb|\u00bb\u00bb\u00bb\u00bb\u00bb\\                    ",
  "((((((>>>>>><<>>><<><<<<<<<<<<<<<>>()[[]]]{{{{}\\\\///||||\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|[,                                                               .;>)[{{|/\\\\|\u00ab\u00ab{.      <\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\u00bb\u00bb\u00ab.                   ",
  "((((((((((((><<<<<><<<<<<<>>>>>>>(([[]}}}}}}\\\\\\/|||\u00ab\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\\(.                                                                   <\\}}\u00ab\u00bb\\]]]]|\u00ab[       [\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\u00ab\u00bb\u00bb\u00bb,                   ",
  "())))(((>><><<<<<<<<<<<<<<<<<>>((([[]]{}}/\\\\/||||\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|];                                                                     .[}\\/\u00ab\u00bb|/}]]\\\\].      (\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb[                   ",
  ")(((()(><<<<<<<<<<<<<;<<<<;<<>>(()]]{]{}\\////|||\u00ab\u00ab\u00bb\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab{<.                                                                       ,{|}}{(>[}{}{),       .}\u00ab\u00bb\u00bb};\\\u00bb\u00bb\u00bb\u00bb;                  ",
  "(<>>>><<<<<<<<<<<<<<;;<<<><<>>((()[]{{}}}\\/|||\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|{<.                                                                           ;]]>.    ...           >]\\[  >]}}<                  ",
  ">><<<<<<<<<<<<<<<<<<<<<<>>>>>>(()))]{{}}//|/|\u00ab\u00bb\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab});.                                                                                .                                                 ",
  "<<<<><<<<<<<<<;<;<;<>(((((((((()[]{{}}\\/||//|\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb/[<.                                                                                                                                      ",
  "<<<<<<<<<<;;;;<>;<<>((())))))[)[]{{\\\\\\/||\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|]>:                                                                                                                                          ",
  "<<<<<;<<<<<<<<<<>>(())))))[)[]]]{{}\\\\\\||||\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|{<.                                                                                                                                             ",
  "<<<<<>>><<>>>>>>(())))[[[[[]]{{{{}\\\\\\/||\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab];                                                                                                                                                 ",
  ">>>>>(((>>>((((()[[[[[]]]]{{{}\\\\\\//|||\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\\(,                                                                                                                                                   ",
  "()))())))())[[]]]{{{}}}}}}}}\\\\/|||\u00ab\u00bb\u00bb\u00bb\u00bb\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|{(:                                                                                                                                                      ",
  ")[]]]]{}\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\/////||||\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb/),                                                                                                                                                         ",
  "[{{{{}\\/\u00ab\u00ab|||///||||||||||||\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb/[;                                                                                                                                                            ",
  "{{}}}\\/||||\u00ab\u00ab\u00ab\u00ab\u00ab||\u00ab\u00bb\u00bb\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\\[;                                                                                                                                                               ",
  "}\\/|||||\u00ab\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\\):                                                                                                                                                                  ",
  "|\u00ab\u00bb\u00bb\u00bb\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab}(,                                                                                                                                                                     ",
  "\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb/{<.                                                                                                                                                                        ",
  "\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb/}[>:                                                                                                                                                                            ",
  "\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab|}[>:                                                                                                                                                                                 ",
  "\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab|\\{)<:.                                                                                                                                                                                     ",
  "{][)((><;;:,.                                                                                                                                                                                           ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        "
];

const RIGHT_ASCII_LINES = [
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                ..,,:::;;;<<>(((>>><<<<;",
  "                                                                                                                                                                           ..,,:::;;;;<<<()))()))))))(((",
  "                                                                                                                                                                       ...,,,:::::;<<<<<>((>>>>>(((>>>>>",
  "                                                                                                                                                                  ..,,,,,...,:;:;;;<<>>>>>>>>>>((((>>()(",
  "                                                                                                                                                         ....,,:::::,,...,,,:;<<<<<>(>>>>>>()(((((())[[>",
  "                                                                                                                                                    ..,,::::::::::,,,,,,,::::;<<>>>(((((>(((()))(([[[)>>",
  "                                                                                                                                               ..,:::,::::::,,,,,,,,,,,,:::::;<>>>>>>((>((((())((())(()(",
  "                                                                                                                                          ..,,::::::,,,:::::,,,,,,,,,,,,::::;;;<<<<<>>>>>>>>>>>>>>>>>())",
  "                                                                                                                                      .,::;::::::::::::;:::::,,,,::::::::;;;;:;<<<<<<<<><<>>>>>(((>>>>>>",
  "                                                                                                                       ..,,::::::;;;;;;;;;;::::::::::::::;:::::,::;;;:::;;;<;;;<<<<<<<>>><>>(((())((><;;",
  "                                                                                                               ...,,::;;;;;;;;;;;;;;;;;;;:::;;:::::::::;;:::::::::;;;;;;;;;;;;<<<<<>><<<<>>>><>>>>((((<<",
  "                                                                                                       ....,,,,,,,,:::;;;;;;;;;;;;;;;<<<;;;::::::::::::;;::::::;;;;;;;;;;;;;;;<<<<<<<<;;;;;<<;;<<<<<>>>>",
  "                                                                                          ..,.,,,,,,,,,,,,,,,,,,::::::;;<<<<<<<<<<<<;<<<<;;::::::::::::::::::::;;;;;;::;;;;;;;;;;;:;;;;;;;;;;;;;;<<<<<>>",
  "                                                                               ......,,;;;;:,,,,,,,,,,,,:,,,,,,:;;;<>>>>>>>>>>><<<<<;<<<<;;;;;;;::::::::::::::::;;;::::::::,,,,,,,,,,::::::;;;;<<<>><<<<",
  "                                                                        .,,,:;;<>(><<>><<<;;:::::;<<>>>>><<<<<<>((()))))((>>>>>>><<;;;<;;;;;;;;;;;:::,,,:,,:,,,,,,...,,...........,,,:,::::;;;<<<<<>>(((",
  "                                                              .......,,,,:::;<<<>((><><;;;;;;;<<()[[]]]][)))))[[]]]]]][)((>>>>>><;;;;;;;;;;;;;::::::,,,,,,,,,,,..................,,,,::::;;;;<<<>>>>())[",
  "                                                         ..,,:;;;::,,,,::;;;;<<<>((>><;:;<<<>()]{{{{}}\\\\\\}\\}}}}}{{]{][)((>>><<<;;;;;;::;;;;;;::;:::,,:,,,,,,,,.,,,.........,,,,,,,,,,:::;;<<<<<>>()[[]{{",
  "                                                     .,,:::::;;<<;:::::;;<<<;;<<((((><:;<<()[]{{{{{}}\\\\\\\\\\\\\\\\}{{{{{{][)(>>>><<<<;;;;;;;:::::::::::::::;:,,:::,,,,,,,,,,,,,,,,,,,,,:::;::;;<>>>()[[]]{}}}",
  "                                          .,,...,,,,:::;;<;;<<<;;::::;;<<<<;;;<>()[[[)>>){//}{]]]]{}}\\\\\\\\\\\\\\\\\\}{{{]][[)(>((>>>><<<<;;;;;;;:::;;:::::::::,,,,,,,,,,,,,,,,,,,,,:::::::;<<<<<>()[[]]]{}\\\\\\/",
  "                    ..,,,,,::,,,,,,.,..,,:;<;<<<<<<;;;;<<<<>(><;;;;;;;<<<<<<<<>((]{}//\\/\u00ab\u00bb\u00bb/{]]]]{}\\\\\\\\\\}}}\\\\\\}}}}][[)((((((>>><<<;;;;;;;<<<<><<<<;;;<<<;::::,,,,,,,,,,,:::::<;;<<<<<<>(((([[[[{}\\\\///|\u00ab",
  "                .,,:>>((>;<<<<<>>>>>>:,::,,:;<>>((((>>>((([]((<<;;;<<<<<<<<<<<<>){\\/\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab/\\\\\\\\\\\\\\\\\\}}{]]]]]]]]][[)(((((((>>>>>>>>>>((>(())))))))))(((><;<<<;;;:::::::;;;;;<<<<<<>()[)[[]]]{}\\////|\u00ab\u00bb\u00bb",
  "        ..,,,,,:::;>(){|{><>>>>>>(((>,..,::,::<({\\\\\\{]{}/|}(><;;><<>><<<<<<<><<(]{//\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab|//\\{{{{{{{}}}}}}}}}\\}{][[[[[[[)[[]]]]]]]]]{{]]]{{]]]][))((((>>><<<<<<><<<<>>>>>>>>()[[]]{{{}\\||\u00ab|\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb",
  "     .,,:<(()[[]]{{{\\\u00ab\u00bb\u00bb\u00bb\\\\\\\\\\\\}}}}\\],.,,:<>,,:<]/\u00ab\u00ab\u00bb\u00bb\u00ab\u00ab/);:::,:>>((><<<<<<><<>[{\\/\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|/\\\\///||||||||///////////\\\\}}}}}}}}}}\\\\\\}}\\\\\\}}}}}}}}}}}{{{{]{{]))(((()))))))))))[]]]]{{{}\\//||\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb",
  "  ,<<<>>)]}/|\u00ab\u00bb\u00bb\u00ab\u00ab|||/{[[[[{/\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab):::<>}}<,,<{\u00bb\u00bb\u00bb\u00bb/):,,,,,:<))[[(>>><<<>>>){\\/\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab|///\\\\}}}}}}{{{{{}}{{{}}}}{}}}}\\\\\\\\\\\\\\\\\\\\\\///\\\\\\\\\\\\{{{]]][[[]]]]]]{{{{}}}}}}\\//||\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb",
  "  ,(]{}}}/|/}]>;,,...        ,:;;;;;<<:<([]{/|}(>(}/|};,::::::;(]}}}])(>>>())[}/\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab||/\\\\}{{{{}}{}}}}}\\}\\\\/\\///\\/|||\u00ab\u00ab||////\\\\\\}}}}}{{{{{}}}}\\\\\\//////||\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb",
  "         ..                            ,)\\|\u00ab\u00ab\u00ab\u00ab\u00ab|//\\):,::;<<<>([{|\u00ab\u00ab/{[))]{{}/\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab|///////////\\\\///||||||\u00ab\u00ab\u00ab\u00ab||\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab||///////\\//\\\\\\////////||\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb",
  "                                         .;/\u00ab\u00bb\u00bb\u00bb\u00ab\\[;,:::;<>()]}/\u00ab\u00bb\u00bb\u00bb\u00bb/}}/||/|\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab||||\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab/////////////////||\u00ab|\u00ab\u00ab|\u00ab\u00ab\u00ab\u00bb\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\u00ab\u00ab\u00ab|||||||/||||||/|\u00ab|\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb",
  "                                         :{||\\](;,,:;<<>)]{/\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\\);,.  .,:<([{\\/////|||//////|||||\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab|\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab/}[>;",
  "                                        .){[(<:,,,,<)[{\\|\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\\(,                .,,;<>()]{{}}\\//|||||||||/|||//\\\\}}}}}\\\\\\\\\\\\\\\\}/\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab/}[>;.     ",
  "                                      :<;:<;>>>><>){/\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00ab\u00ab\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb|];                                 ....,,,,,,......                 .,;;>()]}\\\\///||||///\\{][)<:.           ",
  "                                   .:((([;;<>[/}}|\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb/}][[[]|\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\\[;.                                                                                                            ",
  "                                .,;;<<>)[)()]/|\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb];:;<<>([{\u00ab\u00bb|]{\\|\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb\u00bb};                                                                                                                ",
  "                               ;(<;<<>));<([//|\u00ab\u00bb\u00bb\\{[/\u00bb\u00bb|{<<<<<([]/\u00ab/{[[]{{}\\/|\u00bb\u00bb\u00bb\u00bb\u00ab/)                                                                                                                  ",
  "                               ;[{(()[>,<[{}/|\u00ab\u00ab\\[((]\u00ab\u00bb\u00bb\u00bb\u00bb/)>><([[[{/\u00ab\u00ab\\][[[}\\\\}}]>,                                                                                                                    ",
  "                                .;>([]]}/|\u00ab\u00bb\u00bb|{[))(]\u00ab\u00bb\u00bb\u00ab]>(\\|/||\\}{]]\\\u00bb\u00bb\u00bb\u00ab\\{[>,                                                                                                                         ",
  "                                   ;}/|\u00bb\u00bb\u00bb\u00bb\u00bb}[[))){\u00bb\u00bb\u00bb}:   ;[)\\\u00bb\u00bb\u00bb/(>>()(>;,                                                                                                                            ",
  "                                   ,>[]\u00ab\u00bb\u00bb\u00bb\\)]\\|\u00ab\u00ab\u00bb\u00bb};     >))\\\u00ab\u00bb|:                                                                                                                                     ",
  "                                   :>[{\u00bb\u00bb\u00bb\u00bb])]]]/\u00bb\u00bb(      >[]/\u00ab\u00ab|<                                                                                                                                      ",
  "                                   ;[}/\u00bb\u00bb\u00bb\u00bb{)[[[}\u00bb\\      <\u00ab\u00bb\u00bb\u00bb\u00bb|:                                                                                                                                       ",
  "                                  .>\\\u00bb\u00ab\u00bb\u00bb\u00bb|(()[}\u00ab|;      )\u00ab\u00bb\u00bb\u00bb\u00bb{                                                                                                                                        ",
  "                                   <){\u00ab\u00bb\u00bb\u00bb)>]\\/\u00ab/:       >|/}/\u00bb]                                                                                                                                        ",
  "                                   ;><]\u00bb\u00bb\u00bb[>{|\u00ab\u00ab[        ,((((}]                                                                                                                                        ",
  "                                   .>>(|\u00ab\u00bb}>>)/|<        ,(>>>((                                                                                                                                        ",
  "                                    <>>/\u00ab\u00bb}>>>}}.         ;>>((:                                                                                                                                        ",
  "                                    ,<(|\u00bb\u00bb]>>)};           .,.                                                                                                                                          ",
  "                                     ,(}]<,,,:,                                                                                                                                                         ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        ",
  "                                                                                                                                                                                                        "
];

const HOVER_RADIUS_VW = 2.6; // vw, size of the lit blob around the cursor
const TRAIL_MS = 280; // how long a lit cell takes to fade out, in real milliseconds (reference site is ~250-300ms)
const HOLE_CHANCE = 0.14; // 0-1, fraction of cells inside the blob that stay unlit (gives the ragged/glitchy holes)
const IDLE_MS = 40; // if the mouse hasn't moved for this long, stop lighting new cells (still cursor = nothing new ignites)
const HEAT_THRESHOLD = 0.04; // heat below this = cell is drawn as plain text again

function AsciiTextHalf({ lines, className }) {
  const preRef = useRef(null);
  const heatRef = useRef(null);
  const dimsRef = useRef({ cols: 0, rows: 0, charW: 0, charH: 0 });
  const mouseRef = useRef({ x: -9999, y: -9999, active: false, lastMoveAt: 0 });
  const rafRef = useRef(null);
  const flatCharsRef = useRef([]); // flat array of every character, in order
  const holeRef = useRef(null); // fixed per-cell random values

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const cols = lines[0]?.length || 0;
    const rows = lines.length;

    // Flatten all characters (including spaces) into one array, so we
    // can rebuild the innerHTML quickly each frame by joining pieces.
    const flat = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        flat.push(lines[row][col]);
      }
    }
    flatCharsRef.current = flat;
    heatRef.current = new Float32Array(cols * rows);
    // Each cell gets a FIXED random 0-1 value. It decides two things:
    //  - whether the cell is one of the "holes" that stays unlit
    //  - how fast this particular cell fades (so the tail dissolves
    //    cell-by-cell instead of fading as one smooth gradient)
    holeRef.current = new Float32Array(cols * rows).map(() => Math.random());

    const computeMetrics = () => {
      const vw = window.innerWidth / 100;
      const fontSize = 0.5 * vw; // matches your earlier 0.5vw sizing

      // Explicit, unambiguous layout: no default <pre> margin, and a
      // line-height in plain pixels (no em/Tailwind class competing).
      const lineHeightPx = fontSize * 0.85;
      pre.style.fontSize = `${fontSize}px`;
      pre.style.lineHeight = `${lineHeightPx}px`;
      pre.style.margin = "0";
      pre.style.padding = "0";
      pre.style.border = "0";

      // MEASURE the real character width from the rendered <pre> itself
      // (not a hidden probe with different inherited styles), by
      // temporarily inserting a known-length row of characters.
      const original = pre.innerHTML;
      pre.textContent = "M".repeat(100);
      const measuredW = pre.scrollWidth / 100;
      pre.innerHTML = original;

      // Total rendered height / number of rows = REAL row pitch.
      const measuredH = pre.scrollHeight / rows;

      const charW = measuredW || fontSize * 0.6;
      const charH = measuredH || lineHeightPx;

      dimsRef.current = { cols, rows, charW, charH, fontSize };
    };
    computeMetrics();

    const handleResize = () => computeMetrics();
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e) => {
      const rect = pre.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
        // stamp the real time of this movement (used to detect "still")
        lastMoveAt: performance.now(),
      };
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    pre.addEventListener("mousemove", handleMouseMove);
    pre.addEventListener("mouseleave", handleMouseLeave);

    let lastRenderedHTML = "";
    let lastTime = 0;

    const tick = (now) => {
      // Real elapsed time since the previous frame, in ms. Clamped so a
      // background tab (huge gap) doesn't wipe the whole trail at once.
      const dt = lastTime ? Math.min(now - lastTime, 50) : 16;
      lastTime = now;
      const { cols, rows, charW, charH } = dimsRef.current;
      const heat = heatRef.current;
      const hole = holeRef.current;
      const mouse = mouseRef.current;
      // "Moving" = cursor is over the art AND it moved within the last
      // IDLE_MS. A parked cursor is NOT moving, so it lights nothing new
      // and every already-lit cell simply fades out (the ~280ms trail).
      const isMoving = mouse.active && now - mouse.lastMoveAt < IDLE_MS;
      const hoverRadius = (HOVER_RADIUS_VW / 100) * window.innerWidth;
      const flat = flatCharsRef.current;

      // Only scan the rows/cols that could possibly be near the cursor
      // (plus every cell that is still cooling down). Cheap bounding box.
      let minRow = 0, maxRow = rows - 1, minCol = 0, maxCol = cols - 1;

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const idx = row * cols + col;
          if (flat[idx] === " ") continue;

          // 1. HEAT UP (only while moving): every cell inside the blob is set hot, except the
          //    "hole" cells. Hotter toward the centre, so the edge fades.
          if (isMoving) {
            const cx = col * charW + charW / 2;
            const cy = row * charH + charH / 2;
            const dx = mouse.x - cx;
            const dy = mouse.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < hoverRadius && hole[idx] > HOLE_CHANCE) {
              const proximity = 1 - dist / hoverRadius;
              // Ragged edge: outer cells only light up some of the time.
              if (proximity > 0.25 || hole[idx] > 0.6) {
                heat[idx] = 1;
              }
            }
          }

          // 2. COOL DOWN over TRAIL_MS milliseconds. Each cell has its own
          //    fade speed (0.85x - 1.25x), so the trail breaks up into a
          //    scattered, glitchy dissolve instead of one smooth fade.
          if (heat[idx] > 0) {
            const speed = 0.85 + hole[idx] * 0.4;
            heat[idx] = Math.max(0, heat[idx] - (dt / TRAIL_MS) * speed);
          }
        }
      }

      // 3. REBUILD THE MARKUP. A lit cell is an inline-block sized to the
      //    EXACT measured cell, so the red fills the whole box edge to
      //    edge and neighbouring lit cells merge into one solid shape.
      const cellStyle =
        "display:inline-block;width:" + charW + "px;height:" + charH +
        "px;line-height:" + charH + "px;text-align:center;vertical-align:top;";
      let html = "";
      let plain = "";
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          const ch = flat[idx];
          const h = heat[idx];

          if (h > HEAT_THRESHOLD && ch !== " ") {
            if (plain) { html += escapeHtml(plain); plain = ""; }
            // opacity follows heat, so cells fade out instead of popping off
            html +=
              '<span style="' + cellStyle +
              "color:#0a0a0a;background:rgba(255,59,20," + h.toFixed(2) + ');">' +
              escapeHtml(ch) + "</span>";
          } else {
            plain += ch;
          }
        }
        plain += "\n";
      }
      if (plain) html += escapeHtml(plain);

      if (html !== lastRenderedHTML) {
        pre.innerHTML = html;
        lastRenderedHTML = html;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);
      pre.removeEventListener("mousemove", handleMouseMove);
      pre.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [lines]);

  return (
    <pre
      ref={preRef}
      className={`font-mono whitespace-pre opacity-90 text-red-700 ${className}`}
    >
      {lines.join("\n")}
    </pre>
  );
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Scroll-in animation window, measured against the FOOTER's top edge.
// "top 50%" = footer's top edge is halfway up the screen (animation starts)
// "top 0%"  = footer's top edge reaches the very top   (animation finished)
const SLIDE_START = "top 70%";
const SLIDE_END = "top 0%";
const SLIDE_EXTRA_PX = 80; // extra distance past the screen edge, so nothing peeks in (covers the +-30px mouse drift too)

export default function AsciiHands() {
  const wrapRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const leftSlideRef = useRef(null); // outer wrapper: scroll slide-in (left hand)
  const rightSlideRef = useRef(null); // outer wrapper: scroll slide-in (right hand)

  // Whole-half drift effect (kept from your original)
  useEffect(() => {
    const wrap = wrapRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!wrap || !left || !right) return;

    const handleMouseMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      const relX = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const relY = (e.clientY - rect.top - rect.height / 2) / rect.height;

      const maxOffset = 30;

      gsap.to(left, {
        x: relX * -maxOffset,
        y: relY * maxOffset,
        duration: 0.6,
        ease: "power3.out",
      });
      gsap.to(right, {
        x: relX * maxOffset,
        y: relY * maxOffset,
        duration: 0.6,
        ease: "power3.out",
      });
    };

    wrap.addEventListener("mousemove", handleMouseMove);
    return () => wrap.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // SCROLL SLIDE-IN: each hand starts completely off-screen on its own
  // side and slides to its natural spot, scrubbed to scroll position.
  // Lives on the OUTER wrapper divs so it never collides with the
  // mouse-drift tween above, which animates the inner divs.
  useEffect(() => {
    const wrap = wrapRef.current;
    const leftSlide = leftSlideRef.current;
    const rightSlide = rightSlideRef.current;
    if (!wrap || !leftSlide || !rightSlide) return;

    // Use the footer as the scroll trigger (falls back to the wrapper).
    const trigger = wrap.closest("footer") || wrap;

    // Distance needed to push each hand fully past its screen edge.
    // getBoundingClientRect includes the current transform, so subtract
    // the current x to get the hand's NATURAL (untransformed) position.
    const leftStart = () => {
      const natRight = leftSlide.getBoundingClientRect().right - gsap.getProperty(leftSlide, "x");
      return -(natRight + SLIDE_EXTRA_PX);
    };
    const rightStart = () => {
      const natLeft = rightSlide.getBoundingClientRect().left - gsap.getProperty(rightSlide, "x");
      return window.innerWidth - natLeft + SLIDE_EXTRA_PX;
    };

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger,
          start: SLIDE_START,
          end: SLIDE_END,
          scrub: true,
          invalidateOnRefresh: true, // re-measure on resize
        },
      });

      // Both tweens sit at time 0, so both hands move together.
      tl.fromTo(leftSlide, { x: leftStart }, { x: 0, ease: "none" }, 0);
      tl.fromTo(rightSlide, { x: rightStart }, { x: 0, ease: "none" }, 0);
    }, wrap);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="footer-ascii-wrap flex justify-center items-center w-full h-full select-none overflow-hidden"
    >
      <div ref={leftSlideRef} className="shrink-0">
        <div ref={leftRef} className="footer-ascii left">
          <AsciiTextHalf lines={LEFT_ASCII_LINES} className="ascii-left" />
        </div>
      </div>
      <div ref={rightSlideRef} className="shrink-0">
        <div ref={rightRef} className="footer-ascii right">
          <AsciiTextHalf lines={RIGHT_ASCII_LINES} className="ascii-right" />
        </div>
      </div>
    </div>
  );
}