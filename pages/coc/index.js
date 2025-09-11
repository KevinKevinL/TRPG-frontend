import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ProfessionCard } from '@components/coc/ProfessionCard';
import { ProfessionInfoModal } from '@components/coc/ProfessionInfoModal';
import { PROFESSIONS } from '@constants/professions';
import DatabaseManager from '@components/coc/DatabaseManager';
import { character } from '@utils/characterState';

const COCCharacterCreator = () => {
  const [selectedProfession, setSelectedProfession] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentProfession, setCurrentProfession] = useState(null);
  const router = useRouter();
  
  // 使用数据库管理器
  const {
    currentCharacterId,
    dbStatus,
    error,
    createNewCharacter, // 确保这里正确导出了createNewCharacter
    saveProfessionChoice
  } = DatabaseManager();

  // 在组件加载时清除之前的角色数据
  useEffect(() => {
    character.clear();
  }, []);

  const handleCardClick = (profession) => {
    setCurrentProfession(profession);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setCurrentProfession(null);
  };

  const handleProfessionSelect = (profession) => {
    setSelectedProfession(profession);
    // 只保存到前端状态
    character.setProfession(profession);
    character.save();
  };

  const handleContinue = async () => {
    if (selectedProfession) {
      try {
        console.log('开始创建新角色...');
        
        // 创建新角色并获取ID
        const newCharacterId = await createNewCharacter();
        console.log('新角色创建完成，ID:', newCharacterId);
        
        if (!newCharacterId) {
          throw new Error('创建新角色失败');
        }

        // 保存职业选择
        console.log('开始保存职业选择...');
        await saveProfessionChoice(newCharacterId, selectedProfession.title);
        console.log('职业选择保存完成');
        
        // 跳转到属性页面
        console.log('准备跳转到属性页面...');
        router.push({
          pathname: '/coc/attributes',
          query: { 
            profession: selectedProfession.key
          }
        });
      } catch (error) {
        console.error('处理角色创建失败:', error);
        setError(`创建角色失败: ${error.message}`);
      }
    } else {
      console.log('没有选择职业，无法继续');
    }
  };

  return (
    <>
      <Head>
        <title>COC - 调查员创建</title>
        <meta name="description" content="克苏鲁的呼唤 调查员创建" />
      </Head>
      
      <div className="min-h-screen bg-[#0a0d11] bg-gradient-radial-emerald py-10">
        <div className="max-w-6xl mx-auto px-6">
          {/* 数据库状态信息 */}
          {(dbStatus || error) && (
            <div className={`text-center mb-4 ${error ? 'text-red-500' : 'text-emerald-400'}`}>
              {error || dbStatus}
            </div>
          )}

          {/* 标题 */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-emerald-500 font-lovecraft 
                         tracking-wider drop-shadow-lg">
              克苏鲁的呼唤
              <span className="block text-2xl mt-2 text-emerald-400/80">
                调查员创建
              </span>
            </h1>
          </div>

          {/* 选中职业提示 */}
          {selectedProfession && (
            <div className="text-center mb-4">
              <p className="text-emerald-400 font-lovecraft">
                已选择: {selectedProfession.title}
              </p>
            </div>
          )}
          
          {/* 职业卡片网格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(PROFESSIONS).map(([key, profession]) => (
              <ProfessionCard
                key={key}
                profession={profession}
                isSelected={selectedProfession?.title === profession.title}
                onCardClick={handleCardClick}
              />
            ))}
          </div>

          {/* 继续按钮 */}
          {selectedProfession && (
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
                继续创建角色 →
              </button>
            </div>
          )}
          
          <ProfessionInfoModal
            profession={showModal ? currentProfession : null}
            onClose={handleModalClose}
            onSelect={handleProfessionSelect}
          />
        </div>
      </div>
    </>
  );
};

export default COCCharacterCreator;