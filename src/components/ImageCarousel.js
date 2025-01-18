import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import img1 from '../picture/1.png';
import img2 from '../picture/2.png';
import img3 from '../picture/3.png';
import img4 from '../picture/4.png';
import img5 from '../picture/5.png';

const slideIn = keyframes`
  from {
    transform: translateX(100%) scale(0.8);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
  to {
    transform: translateX(-100%) scale(0.8);
    opacity: 0;
  }
`;

const float = keyframes`
  0% { transform: translateY(0px) }
  50% { transform: translateY(-20px) }
  100% { transform: translateY(0px) }
`;

const CarouselWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const BackgroundCircle = styled.div`
  position: absolute;
  border-radius: 50%;
  z-index: 0;
  
  &.circle1 {
    width: 300px;
    height: 300px;
    background: rgba(108, 92, 231, 0.1);
    top: -50px;
    right: -100px;
    animation: ${float} 6s ease-in-out infinite;
  }
  
  &.circle2 {
    width: 200px;
    height: 200px;
    background: rgba(74, 144, 226, 0.1);
    bottom: 50px;
    right: 50px;
    animation: ${float} 8s ease-in-out infinite;
  }
  
  &.circle3 {
    width: 150px;
    height: 150px;
    background: rgba(255, 255, 255, 0.05);
    top: 50%;
    right: -50px;
    animation: ${float} 7s ease-in-out infinite;
  }
`;

const CarouselContainer = styled.div`
  width: 100%;
  height: 600px;
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  transform: perspective(1000px) rotateY(-5deg);
  transition: transform 0.3s ease;
  z-index: 1;

  &:hover {
    transform: perspective(1000px) rotateY(0deg);
  }
`;

const Image = styled.img`
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: ${props => props.entering ? slideIn : slideOut} 0.8s ease-in-out;
  opacity: ${props => props.active ? 1 : 0};
  transform-origin: center center;
  transition: transform 0.3s ease;
  filter: ${props => props.loaded ? 'none' : 'blur(10px)'};

  &:hover {
    transform: scale(1.05);
  }
`;

const ImagePlaceholder = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, #f3f3f3 25%, #e6e6e6 25%, #e6e6e6 50%, #f3f3f3 50%, #f3f3f3 75%, #e6e6e6 75%, #e6e6e6);
  background-size: 20px 20px;
  animation: ${props => props.entering ? slideIn : slideOut} 0.8s ease-in-out;
`;

const ProgressBar = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 2;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(5px);
`;

const ProgressDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.active ? '#4A90E2' : 'rgba(255, 255, 255, 0.3)'};
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: scale(1.2);
    background: ${props => props.active ? '#4A90E2' : 'rgba(255, 255, 255, 0.5)'};
  }
`;

const ImageCarousel = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const [entering, setEntering] = useState(true);
  const [loadedImages, setLoadedImages] = useState({});
  const images = [img1, img2, img3, img4, img5];

  // Preload images
  useEffect(() => {
    images.forEach((src, index) => {
      const imgElement = document.createElement('img');
      imgElement.src = src;
      imgElement.onload = () => {
        setLoadedImages(prev => ({
          ...prev,
          [index]: true
        }));
      };
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setEntering(false);
      setTimeout(() => {
        setCurrentImage((prev) => (prev + 1) % images.length);
        setEntering(true);
      }, 400);
    }, 4000);

    return () => clearInterval(interval);
  }, [images.length]);

  const handleDotClick = (index) => {
    setEntering(false);
    setTimeout(() => {
      setCurrentImage(index);
      setEntering(true);
    }, 400);
  };

  return (
    <CarouselWrapper>
      <BackgroundCircle className="circle1" />
      <BackgroundCircle className="circle2" />
      <BackgroundCircle className="circle3" />
      <CarouselContainer>
        {images.map((img, index) => (
          <React.Fragment key={index}>
            {!loadedImages[index] && (
              <ImagePlaceholder
                entering={entering && index === currentImage}
              />
            )}
            <Image
              src={img}
              alt={`Portfolio image ${index + 1}`}
              active={index === currentImage}
              entering={entering && index === currentImage}
              loaded={loadedImages[index]}
              loading="lazy"
              onLoad={() => {
                setLoadedImages(prev => ({
                  ...prev,
                  [index]: true
                }));
              }}
            />
          </React.Fragment>
        ))}
        <ProgressBar>
          {images.map((_, index) => (
            <ProgressDot
              key={index}
              active={index === currentImage}
              onClick={() => handleDotClick(index)}
            />
          ))}
        </ProgressBar>
      </CarouselContainer>
    </CarouselWrapper>
  );
};

export default ImageCarousel; 