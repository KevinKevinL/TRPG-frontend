import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AttributeBox } from '@components/coc/AttributeBox';
import { DiceAnimation } from '@components/coc/DiceAnimation';
import { generateAttributes } from '@utils/diceSystem';
import { attributeMapping, derivedAttributes } from '@constants/characterConfig';
import { PROFESSIONS } from '@constants/professions';
import { character } from '@utils/characterState';
import DatabaseManager from '@components/coc/DatabaseManager';


const AttributesGenerator = () => {
  const [dbStatus, setDbStatus] = useState('');
  const [attributes, setAttributes] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [age, setAge] = useState(25);
  const [showAgeError, setShowAgeError] = useState(false);
  const router = useRouter();
  const { profession: professionTitle } = router.query;
  const profession = professionTitle && PROFESSIONS[professionTitle];

  // 初始化时检查状态
  useEffect(() => {
    // 设置客户端渲染标志
    setIsClient(true);

    // 如果没有保存的职业信息但有 URL 参数中的职业，则设置职业
    if (!character.profession && profession) {
      character.setProfession(profession);
    }

    // 尝试加载已保存的属性和年龄
    const savedCharacter = character.export();
    if (savedCharacter.attributes) {
      setAttributes(savedCharacter.attributes);
      setAge(savedCharacter.metadata.age || 25);
    } else {
      // 如果没有保存的属性，生成新的
      const newAttributes = generateAttributes(age);
      setAttributes(newAttributes);
      character.setAttributes(newAttributes);
      character.updateMetadata({ age });
      character.save();
    }
  }, [profession]);

  // 年龄变化时重新生成属性
  useEffect(() => {
    if (isClient && profession) {
      const newAttributes = generateAttributes(age, profession);
      setAttributes(newAttributes);
      character.setAttributes(newAttributes);
      character.updateMetadata({ age });
      character.save();
    }
  }, [age, profession, isClient]);

  const handleReroll = () => {
    setIsRolling(true);
    setTimeout(() => {
      const newAttributes = generateAttributes(age, profession);
      setAttributes(newAttributes);
      character.setAttributes(newAttributes);
      character.save();
      setIsRolling(false);
    }, 800);
  };

  const {
    currentCharacterId,
    saveAttributes,
    saveDerivedAttributes
  } = DatabaseManager();

  const handleContinue = async () => {
    console.log('点击继续按钮');
    console.log('currentCharacterId:', currentCharacterId);
    console.log('attributes 数据:', JSON.stringify(attributes, null, 2));
    
    if (attributes && currentCharacterId) {
      try {
        console.log('开始保存属性');
        
        // 调试：打印实际执行的 SQL
        const sql = `
          INSERT INTO Attributes (
            character_id, strength, constitution, size, dexterity,
            appearance, intelligence, power, education, luck
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            strength = VALUES(strength),
            constitution = VALUES(constitution),
            size = VALUES(size),
            dexterity = VALUES(dexterity),
            appearance = VALUES(appearance),
            intelligence = VALUES(intelligence),
            power = VALUES(power),
            education = VALUES(education),
            luck = VALUES(luck)
        `;
        console.log('SQL语句:', sql);
        console.log('SQL参数:', [
          currentCharacterId,
          attributes.strength,
          attributes.constitution,
          attributes.size,
          attributes.dexterity,
          attributes.appearance,
          attributes.intelligence,
          attributes.power,
          attributes.education,
          attributes.luck
        ]);
        
        await saveAttributes(currentCharacterId, attributes);
        console.log('属性保存成功，准备跳转');

        // 保存派生属性
        console.log('开始保存派生属性');
            // 保存派生属性到 derivedattributes 表
            const derived = {
                character_id: currentCharacterId,
                sanity: attributes.sanity,
                magicPoints: attributes.magicPoints,
                interestPoints: attributes.interestPoints,
                hitPoints: attributes.hitPoints,
                moveRate: attributes.moveRate,
                damageBonus: attributes.damageBonus,
                build: attributes.build,
                professionalPoints: attributes.professionalPoints
            };

            // 调用数据库保存函数
            await saveDerivedAttributes(currentCharacterId, derived);

            console.log('属性保存成功，准备跳转');
        
      // 传递必要的信息到技能页面
      router.push({
        pathname: '/coc/skills',
        query: { 
            profession: professionTitle,
        }
      });
      } catch (error) {
        console.error('保存属性失败:', error);
        // 显示错误信息在界面上
        setDbStatus(`保存失败: ${error.message}`);
      }
    } else {
      console.log('缺少必要数据:',
        !attributes ? 'attributes为空' : '',
        !currentCharacterId ? 'characterId为空' : ''
      );
    }
  };

  const handleAgeChange = (e) => {
    const value = e.target.value;
    
    if (value === '') {
      setAge('');
      return;
    }

    const newAge = parseInt(value);
    
    if (isNaN(newAge)) {
      return;
    }
    
    setAge(value);
    
    if (newAge < 15 || newAge > 90) {
      setShowAgeError(true);
      setTimeout(() => setShowAgeError(false), 3000);
    } else {
      setShowAgeError(false);
      character.updateMetadata({ age: newAge });
    }
  };

  const handleAgeBlur = () => {
    const newAge = parseInt(age);
    
    if (isNaN(newAge)) {
      setAge(25);
      character.updateMetadata({ age: 25 });
      return;
    }

    let finalAge = newAge;
    if (newAge < 15) {
      finalAge = 15;
    } else if (newAge > 90) {
      finalAge = 90;
    }
    
    setAge(finalAge);
    character.updateMetadata({ age: finalAge });
    setShowAgeError(false);
  };

  // 在 profession 不存在时添加了加载状态的处理
  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0d11]">
        <div className="text-xl text-emerald-400 font-lovecraft">加载中...</div>
      </div>
    );
  }

  // 确保在没有 profession 时也能正确显示
  if (!profession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0d11]">
        <div className="flex flex-col items-center gap-4">
          <div className="text-xl text-emerald-400 font-lovecraft">无效的职业选择</div>
          <Link 
            href="/coc"
            className="text-emerald-400 hover:text-emerald-300 
                     transition-colors font-lovecraft tracking-wider"
          >
            ← 返回职业选择
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>COC - {profession.title}Attributes</title>
        <meta name="description" content={`Call Of Cthulhu ${profession.title}Attributes`} />
      </Head>
      
      <div className="min-h-screen bg-[#0a0d11] py-10">
        <div className="max-w-4xl mx-auto px-6">
          {/* 返回按钮 */}
          <Link 
            href="/coc"
            className="inline-block mb-6 text-emerald-400 hover:text-emerald-300 
                     transition-colors font-lovecraft tracking-wider"
          >
            ← Return to profession selection
          </Link>

          {/* 职业信息 */}
          <div className="mb-8 p-6 bg-slate-800/50 border border-emerald-900/30 rounded-lg shadow-lg">
            <h1 className="text-4xl font-bold mb-4 text-emerald-500 font-lovecraft 
                         tracking-wider drop-shadow-lg text-center">
              {profession.title}
              <span className="block text-2xl mt-2 text-emerald-400/80">
                Attribute Generation and skill points allocation
              </span>
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 text-emerald-400/80">
              <div>
                <h3 className="text-lg font-lovecraft mb-2">Profession skills:</h3>
                <ul className="list-disc list-inside space-y-1 font-numbers">
                  {profession.skills.map((skill, index) => (
                    <li key={index}>{skill}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-lovecraft mb-2">CreditRating:</h3>
                  <p className="font-numbers">{profession.creditRating}</p>
                </div>
                <div>
                  <h3 className="text-lg font-lovecraft mb-2">SkillPoints:</h3>
                  <p className="font-numbers">{profession.skillPoints}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 年龄选择 */}
          <div className="mb-8 text-center">
             <div className="mb-6 relative">
               <label className="mr-2 text-gray-300 font-lovecraft">Age (15-90):</label>
               <input
                 type="text" // 改为 text 类型以支持更自由的输入
                 inputMode="numeric" // 在移动设备上显示数字键盘
                 pattern="[0-9]*" // 限制只能输入数字
                 value={age}
                 onChange={handleAgeChange}
                 onBlur={handleAgeBlur}
                 className={`bg-slate-800 text-emerald-400 border 
                           rounded px-2 py-1 w-20 text-center font-numbers
                           ${showAgeError ? 'border-red-500' : 'border-emerald-900'}
                           focus:outline-none focus:border-emerald-500
                           transition-colors`}
               />
               {showAgeError && (
                 <div className="absolute w-full text-red-500 text-sm mt-1 font-lovecraft">
                   age must be between 15 and 90
                 </div>
               )}
             </div>
            <button
              onClick={handleReroll}
              disabled={isRolling}
              className="bg-emerald-900/50 text-emerald-400 px-8 py-3 rounded-lg 
                       hover:bg-emerald-800/50 transition-colors
                       flex items-center justify-center gap-2 mx-auto 
                       disabled:bg-slate-800/50 disabled:text-emerald-700
                       min-w-[160px] border border-emerald-900/30
                       shadow-lg shadow-emerald-900/30
                       font-lovecraft tracking-wide"
            >
              <DiceAnimation isRolling={isRolling} />
              {isRolling ? "Explore the unknown..." : "Reroll Attributes"}
            </button>
          </div>

          {/* 属性显示 */}
          <div className={`transition-opacity duration-300 ${isRolling ? 'opacity-50' : 'opacity-100'}`}>
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-emerald-400 font-lovecraft">Basic attributes</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {attributeMapping.map(attr => (
                  <AttributeBox
                    key={attr.key}
                    label={attr.label}
                    englishLabel={attr.englishLabel}
                    value={attributes?.[attr.key]}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 text-emerald-400 font-lovecraft">Derived attributes</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {derivedAttributes.map(attr => (
                  <AttributeBox
                    key={attr.key}
                    label={attr.label}
                    englishLabel={attr.englishLabel}
                    value={attributes?.[attr.key]}
                    showDerived={false}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 继续按钮 */}
          <div className="mt-8 text-center">
        <button
          onClick={handleContinue}
          className="bg-emerald-900/50 text-emerald-400 px-8 py-3 rounded-lg 
                   hover:bg-emerald-800/50 transition-colors
                   inline-flex items-center gap-2
                   min-w-[160px] border border-emerald-900/30
                   shadow-lg shadow-emerald-900/30
                   font-lovecraft tracking-wide"
        >
           Go on to skill points allocation →
        </button>
      </div>
        </div>
      </div>
    </>
  );
};

export default AttributesGenerator;
